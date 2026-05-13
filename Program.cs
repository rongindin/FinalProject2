using System;
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
    Console.WriteLine($"Local:   http://localhost:{port}/website/pages/index.html");
    Console.WriteLine($"Network: http://{Network.GetLocalNetworkIPAddress()}:{port}/website/pages/index.html");

    while (true)
    {
      var request = server.WaitForRequest();

      Console.WriteLine($"Recieved a request: {request.Name}");

      try
      {
        if (request.Name == "getItems")
        {
          request.Respond(database.Items);
        }
        else if (request.Name == "addItem")
        {
          var (name, amount) = request.GetParams<(string, int)>();
          var item = new Item(name, amount);
          database.Items.Add(item);
          database.SaveChanges();
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
  public DbSet<Item> Items { get; set; } = default!;
}

class Item(string name, double amount)
{
  public int Id { get; set; } = default!;
  public string Name { get; set; } = name;
  public double Amount { get; set; } = amount;
}