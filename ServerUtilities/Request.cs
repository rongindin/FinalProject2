using System;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Project.ServerUtilities;

//
// Summary:
// Represents an HTTP request in the server context.
// This class provides methods to handle request parameters and responses.
public class Request(HttpListenerContext context, string path)
{
  readonly HttpListenerContext _context = context;
  static readonly JsonSerializerOptions JsonSerializeOptions = new()
  {
    IncludeFields = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
  };
  static readonly JsonSerializerOptions JsonDeserializeOptions = new()
  {
    IncludeFields = true,
  };

  //
  // Summary:
  // Name of the request.
  public string Name { get; } = path;

  //
  // Summary:
  // Gets the parameters of the request.
  //
  // Returns:
  //   The deserialized parameters of the request.
  public T GetParams<T>()
  {
    var streamReader = new StreamReader(_context.Request.InputStream, _context.Request.ContentEncoding);
    var jsonStr = streamReader.ReadToEnd();

    if (IsTuple(typeof(T)))
    {
      jsonStr = TupliseArrayJsonStr(jsonStr);
    }

    return JsonSerializer.Deserialize<T>(jsonStr, JsonDeserializeOptions)!;
  }

  //
  // Summary:
  // Responds to the request with the specified value.
  //
  // Parameters:
  //   value:
  //     The value to respond with.
  public void Respond<T>(T value)
  {
    string jsonStr = JsonSerializer.Serialize(value, JsonSerializeOptions);

    if (IsTuple(typeof(T)))
    {
      jsonStr = ArrayifyTupleJsonStr(jsonStr);
    }

    jsonStr = $"{{\"data\": {jsonStr}}}";
    var bytes = Encoding.UTF8.GetBytes(jsonStr);
    _context.Response.OutputStream.Write(bytes);
  }

  //
  // Summary:
  // Sets the status code for the response.
  //
  // Parameters:
  //   statusCode:
  //     The HTTP status code to set for the response.
  public void SetStatusCode(int statusCode)
  {
    _context.Response.StatusCode = statusCode;
  }

  static string TupliseArrayJsonStr(string arrayJsonStr)
  {
    var arrayJsonObj = JsonNode.Parse(arrayJsonStr)!.AsArray();
    var tuplisedObj = new JsonObject();

    int count = 1;
    foreach (var item in arrayJsonObj)
    {
      tuplisedObj[$"Item{count}"] = item?.DeepClone();
      count++;
    }

    var tuplisedStr = tuplisedObj.ToJsonString();

    return tuplisedStr;
  }

  static string ArrayifyTupleJsonStr(string tupleJsonStr)
  {
    var jsonObj = JsonNode.Parse(tupleJsonStr)!.AsObject();

    var arrJsonObj = new JsonArray();

    foreach (var field in jsonObj)
    {
      arrJsonObj.Add(field.Value!.DeepClone());
    }

    var arrJsonStr = arrJsonObj.ToJsonString();

    return arrJsonStr;
  }

  static bool IsTuple(Type type)
  {
    var fields = type.GetFields();

    if (fields.Length == 0)
    {
      return false;
    }

    for (var i = 0; i < fields.Length; i++)
    {
      if (fields[i].Name != $"Item{i + 1}")
      {
        return false;
      }
    }

    return true;
  }
}
