using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace Project.ServerUtilities;

//
// Summary:
// Provides server utilities for handling HTTP requests and responses.
// This class allows for custom request handling and response formatting.
// It includes methods for reading request parameters and sending responses.
// It also supports custom request paths and handles static file serving.
public class Server
{
  readonly HttpListener _listener;
  HttpListenerContext? _context = null;

  //
  // Summary:
  // Initializes a new instance of the Server class with the specified port.
  //  //
  // Parameters:
  //   port:
  //     The port on which the server will listen for requests.
  //  // Returns:
  //   A new instance of the Server class.
  public Server(int port)
  {
    _listener = new HttpListener();
    _listener.Prefixes.Add($"http://*:{port}/");
    _listener.Start();
  }

  //
  // Summary:
  // Waits for an incoming request and returns a Request object representing it.
  // Returns:
  // A Request object representing the incoming request.
  public Request WaitForRequest()
  {
    while (true)
    {
      _context?.Response.Close();
      _context = _listener.GetContext();
      var type = GetRequestType();
      var path = GetPath(type);

      if (type == "custom")
      {
        return new Request(_context, path);
      }

      if (!File.Exists(path))
      {
        _context.Response.StatusCode = 404;
        if (type == "document")
        {
          path = "website/pages/404.html";
        }
        else
        {
          continue;
        }
      }

      _context.Response.ContentType = GetContentType(path);

      _context.Response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      _context.Response.Headers.Add("Pragma", "no-cache");
      _context.Response.Headers.Add("Expires", "Thu, 01 Jan 1970 00:00:00 GMT");

      var fileBytes = GetResponseBytes(path, type);
      _context.Response.OutputStream.Write(fileBytes);
    }
  }

  string GetRequestType()
  {
    var isCustomRequest = _context!.Request.Headers["X-Custom-Request"];
    if (isCustomRequest != null && isCustomRequest == "true")
    {
      return "custom";
    }

    var secFetchDest = _context.Request.Headers["Sec-Fetch-Dest"];
    if (secFetchDest != null && secFetchDest != "empty")
    {
      return secFetchDest;
    }

    var accept = _context.Request.Headers["Accept"];
    if (accept != null && accept.Contains("text/html"))
    {
      return "document";
    }

    return "empty";
  }

  string GetPath(string requestType)
  {
    var context = _context!;

    var path = context.Request.Url!.AbsolutePath[1..];

    if (path == "favicon.ico")
    {
      return "website/favicon.ico";
    }

    if (SupportsJavaScriptFallback(requestType) &&
      !Path.HasExtension(path) &&
      File.Exists($"{path}.js"))
    {
      path += ".js";
    }

    return path;
  }

  static bool SupportsJavaScriptFallback(string requestType)
  {
    return requestType is
      "script" or
      "worker" or
      "sharedworker" or
      "serviceworker" or
      "audioworklet" or
      "paintworklet";
  }

  static string GetContentType(string path)
  {
    return Path.GetExtension(path).ToLowerInvariant() switch
    {
      ".html" => "text/html; charset=utf-8",
      ".js" => "application/javascript; charset=utf-8",
      ".css" => "text/css; charset=utf-8",
      ".ico" => "image/x-icon",
      ".json" => "application/json; charset=utf-8",
      _ => "application/octet-stream",
    };
  }

  static byte[] GetResponseBytes(string path, string requestType)
  {
    if (requestType == "document" &&
      Path.GetExtension(path).Equals(".html", StringComparison.OrdinalIgnoreCase))
    {
      var html = File.ReadAllText(path);
      var htmlWithImportMap = InjectImportMap(html);
      return Encoding.UTF8.GetBytes(htmlWithImportMap);
    }

    return File.ReadAllBytes(path);
  }

  static string InjectImportMap(string html)
  {
    var importMapScript = $"<script type=\"importmap\">{BuildImportMapJson()}</script>";
    var headEndIndex = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);

    if (headEndIndex >= 0)
    {
      return html.Insert(headEndIndex, $"  {importMapScript}\n");
    }

    return $"{importMapScript}\n{html}";
  }

  static string BuildImportMapJson()
  {
    var imports = new SortedDictionary<string, string>(StringComparer.Ordinal);

    foreach (var filePath in Directory.EnumerateFiles("website", "*.js", SearchOption.AllDirectories))
    {
      var relativePath = Path
        .GetRelativePath("website", filePath)
        .Replace('\\', '/');
      var specifier = relativePath[..^3];
      imports[specifier] = $"/website/{relativePath}";
    }

    return JsonSerializer.Serialize(new { imports });
  }
}

public static class Network
{
  //
  // Summary:
  // Returns the IPv4 address that other machines on the same network can use
  // to connect to this server.
  // Returns:
  // The server's LAN IPv4 address, or null if no suitable address was found.
  public static string? GetLocalNetworkIPAddress()
  {
    var address = GetPreferredIPv4Address(requireGateway: true) ??
      GetPreferredIPv4Address(requireGateway: false);

    return address?.ToString();
  }

  static IPAddress? GetPreferredIPv4Address(bool requireGateway)
  {
    IPAddress? fallbackAddress = null;

    foreach (var networkInterface in NetworkInterface.GetAllNetworkInterfaces())
    {
      if (networkInterface.OperationalStatus != OperationalStatus.Up ||
        networkInterface.NetworkInterfaceType == NetworkInterfaceType.Loopback ||
        networkInterface.NetworkInterfaceType == NetworkInterfaceType.Tunnel)
      {
        continue;
      }

      var properties = networkInterface.GetIPProperties();

      if (requireGateway && !HasIPv4Gateway(properties))
      {
        continue;
      }

      foreach (var unicastAddress in properties.UnicastAddresses)
      {
        var address = unicastAddress.Address;

        if (address.AddressFamily != AddressFamily.InterNetwork ||
          IPAddress.IsLoopback(address) ||
          IsLinkLocalIPv4(address))
        {
          continue;
        }

        if (IsPrivateIPv4Address(address))
        {
          return address;
        }

        fallbackAddress ??= address;
      }
    }

    return fallbackAddress;
  }

  static bool HasIPv4Gateway(IPInterfaceProperties properties)
  {
    foreach (var gatewayAddress in properties.GatewayAddresses)
    {
      if (gatewayAddress.Address.AddressFamily == AddressFamily.InterNetwork &&
        !IPAddress.Any.Equals(gatewayAddress.Address))
      {
        return true;
      }
    }

    return false;
  }

  static bool IsLinkLocalIPv4(IPAddress address)
  {
    var bytes = address.GetAddressBytes();
    return bytes[0] == 169 && bytes[1] == 254;
  }

  static bool IsPrivateIPv4Address(IPAddress address)
  {
    var bytes = address.GetAddressBytes();

    return bytes[0] == 10 ||
      (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
      (bytes[0] == 192 && bytes[1] == 168);
  }
}
