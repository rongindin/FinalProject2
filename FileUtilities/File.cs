using System;
using System.IO;

namespace Project.FileUtilities;

public static class File
{
  public static string LoadImage(string imagePath)
  {
    if (string.IsNullOrWhiteSpace(imagePath))
      throw new ArgumentException("Path cannot be null or empty.", nameof(imagePath));
    if (!System.IO.File.Exists(imagePath))
      throw new FileNotFoundException("File not found.", imagePath);

    var base64 = Convert.ToBase64String(System.IO.File.ReadAllBytes(imagePath));
    var ext = Path.GetExtension(imagePath).TrimStart('.').ToLowerInvariant();

    var mime = ext switch
    {
      "jpg" or "jpeg" or "jfif" => "image/jpeg",
      "png" => "image/png",
      "gif" => "image/gif",
      "bmp" => "image/bmp",
      "webp" => "image/webp",
      "svg" => "image/svg+xml",
      "tif" or "tiff" => "image/tiff",
      "ico" or "cur" => "image/x-icon",
      "avif" => "image/avif",
      "heic" => "image/heic",
      "heif" => "image/heif",
      _ => $"image/{ext}"
    };

    return $"data:{mime};base64,{base64}";
  }
}