using System;
using System.Linq;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Project.DatabaseUtilities;
using Project.LoggingUtilities;
using Project.ServerUtilities;

class Program
{
  static void Main()
  {
    int port = 5000;

    var server = new Server(port);
    var database = new Database();

    Console.WriteLine("The server is running");
    Console.WriteLine($"Local:   http://localhost:{port}/website/pages/login.html");
    Console.WriteLine($"Network: http://{Network.GetLocalNetworkIPAddress()}:{port}/website/pages/login.html");

    while (true)
    {
      var request = server.WaitForRequest();

      Console.WriteLine($"Recieved a request: {request.Name}");

      try
      {
        if (request.Name == "signUp")
        {
          var (username, password) = request.GetParams<(string, string)>();

          if (database.Users.Any(user => user.Name == username))
          {
            request.Respond<string?>(null);
            continue;
          }

          var token = Guid.NewGuid().ToString();
          var user = new User(token, username, password);

          database.Users.Add(user);
          database.SaveChanges();

          request.Respond(token);
        }

        else if (request.Name == "logIn")
        {
          var (username, password) = request.GetParams<(string, string)>();

          var user = database.Users.FirstOrDefault(user =>
            user.Name == username &&
            user.Password == password
          );

          request.Respond(user?.Token);
        }

        else if (request.Name == "getUser")
        {
          var token = request.GetParams<string?>();

          var user = token == null
            ? null
            : database.Users.FirstOrDefault(user => user.Token == token);

          request.Respond(user);
        }

        else if (request.Name == "getBalance")
        {
          var token = request.GetParams<string>();

          var user = database.Users.FirstOrDefault(user => user.Token == token);

          if (user == null)
          {
            request.Respond<double?>(null);
            continue;
          }

          request.Respond(user.Balance);
        }

        else if (request.Name == "saveBalance")
        {
          var (token, newBalance) = request.GetParams<(string, double)>();

          var user = database.Users.FirstOrDefault(user => user.Token == token);

          if (user == null)
          {
            request.Respond(false);
            continue;
          }

          user.Balance = newBalance;
          database.SaveChanges();

          request.Respond(true);
        }
      }
      catch (Exception exception)
      {
        request.SetStatusCode(500);
        Log.WriteException(exception);
      }
    }
  }
}

class Database() : DatabaseCore("database")
{
  public DbSet<User> Users { get; set; } = default!;
}

class User(string token, string name, string password)
{
  public int Id { get; set; } = default!;

  [JsonIgnore]
  public string Token { get; set; } = token;

  public string Name { get; set; } = name;

  [JsonIgnore]
  public string Password { get; set; } = password;

  public double Balance { get; set; } = 10000;
}