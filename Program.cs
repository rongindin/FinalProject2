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
          SignUp(request, database);
        }

        else if (request.Name == "logIn")
        {
          LogIn(request, database);
        }

        else if (request.Name == "getUser")
        {
          GetUser(request, database);
        }

        else if (request.Name == "getBalance")
        {
          GetBalance(request, database);
        }

        else if (request.Name == "saveBalance")
        {
          SaveBalance(request, database);
        }

        else if (request.Name == "getLeaderboard")
        {
          GetLeaderboard(request, database);
        }

        else if (request.Name == "getStreak")
        {
          GetStreak(request, database);
        }
        
        else if (request.Name == "saveStreak")
        {
          SaveStreak(request, database);
        }
      }
      catch (Exception exception)
      {
        request.SetStatusCode(500);
        Log.WriteException(exception);
      }
    }
  }

  static void SignUp(Request request, Database database)
  {
    var (username, password) = request.GetParams<(string, string)>();

    bool usernameAlreadyExists = database.Users.Any(user => user.Name == username);

    if (usernameAlreadyExists)
    {
      request.Respond<string?>(null);
      return;
    }

    string token = Guid.NewGuid().ToString();

    var newUser = new User(token, username, password);

    database.Users.Add(newUser);
    database.SaveChanges();

    request.Respond(token);
  }

  static void LogIn(Request request, Database database)
  {
    var (username, password) = request.GetParams<(string, string)>();

    var user = database.Users.FirstOrDefault(user =>
      user.Name == username &&
      user.Password == password
    );

    if (user == null)
    {
      request.Respond<string?>(null);
      return;
    }

    request.Respond(user.Token);
  }

  static void GetUser(Request request, Database database)
  {
    string? token = request.GetParams<string?>();

    if (token == null)
    {
      request.Respond<User?>(null);
      return;
    }

    var user = database.Users.FirstOrDefault(user => user.Token == token);

    request.Respond(user);
  }

  static void GetBalance(Request request, Database database)
  {
    string token = request.GetParams<string>();

    var user = database.Users.FirstOrDefault(user => user.Token == token);

    if (user == null)
    {
      request.Respond<double?>(null);
      return;
    }

    request.Respond(user.Balance);
  }

  static void SaveBalance(Request request, Database database)
  {
    var (token, newBalance) = request.GetParams<(string, double)>();

    var user = database.Users.FirstOrDefault(user => user.Token == token);

    if (user == null)
    {
      request.Respond(false);
      return;
    }

    user.Balance = newBalance;

    database.SaveChanges();

    request.Respond(true);
  }

  static void GetLeaderboard(Request request, Database database)
  {
    var leaderboard = database.Users
      .OrderByDescending(user => user.Balance)
      .Take(10)
      .Select(user => new LeaderboardUser(user.Name, user.Balance, user.Streak))
      .ToList();

    request.Respond(leaderboard);
  }


static void GetStreak(Request request, Database database)
{
  string token = request.GetParams<string>();

  var user = database.Users.FirstOrDefault(user => user.Token == token);

  if (user == null)
  {
    request.Respond<int?>(null);
    return;
  }

  request.Respond(user.Streak);
}

static void SaveStreak(Request request, Database database)
{
  var (token, newStreak) = request.GetParams<(string, int)>();

  var user = database.Users.FirstOrDefault(user => user.Token == token);

  if (user == null)
  {
    request.Respond(false);
    return;
  }

  user.Streak = newStreak;

  database.SaveChanges();

  request.Respond(true);
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
  
  public int Streak { get; set; } = 0;
}

class LeaderboardUser(string name, double balance, int streak)
{
  public string Name { get; set; } = name;

  public double Balance { get; set; } = balance;

  public int Streak { get; set; } = streak;
  
}
}