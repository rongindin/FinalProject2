using System;
using System.Linq;

namespace Project.LoggingUtilities;

// Summary:
// Provides logging utilities for the application.
public static class Log
{
  // Summary:
  // Formats the exception message and stack trace, filtering out lines that do not contain
  // the current directory to make the output more readable, and prints it to the console.
  // // Parameters:
  //   exception:
  //     The exception to log.
  public static void WriteException(Exception exception)
  {
    var shortened = ShortenException(exception);

    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine(shortened);
    Console.ResetColor();
  }

  static string ShortenException(Exception exception)
  {
    string message = exception.Message;

    string stackTrace = exception.StackTrace ?? "";
    string[] lines = stackTrace.Split("\n");
    string[] filteredLines = lines.Where(line => line.Contains(Environment.CurrentDirectory)).ToArray();

    string? innerExceptionMessage = exception.InnerException?.Message;

    string full;
    if (innerExceptionMessage != null)
    {
      full = message + "\n" + innerExceptionMessage + "\n" + string.Join("\n", filteredLines);
    }
    else
    {
      full = message + "\n" + string.Join("\n", filteredLines);
    }

    return full;
  }
}