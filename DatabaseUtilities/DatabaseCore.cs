using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Project.DatabaseUtilities;

// 
// Summary:
// Represents the core database context for the application.
// This class provides tools to manage the database schema.
public class DatabaseCore : DbContext
{
  readonly string _name;

  //
  // Summary:
  // Gets a value indicating whether the database was newly created.
  // // Returns:
  //   true if the database was created; otherwise, false.
  public bool IsNewlyCreated { get; set; }

  //
  // Summary:
  // Initializes a new instance of the DatabaseCore class with the specified database name.
  //
  // Parameters:
  //   name:
  //     The name of the database.
  public DatabaseCore(string name) : base()
  {
    _name = name;

    if (!SchemaMatchesModel())
      Database.EnsureDeleted();

    IsNewlyCreated = Database.EnsureCreated();
    Database.ExecuteSqlRaw("PRAGMA journal_mode = DELETE;");
  }

  protected override void OnConfiguring(DbContextOptionsBuilder options) =>
    options.UseSqlite($"Data Source={_name}.sqlite;");

  private bool SchemaMatchesModel()
  {
    using var conn = new SqliteConnection($"Data Source={_name}.sqlite");
    conn.Open();

    foreach (var entity in Model.GetEntityTypes())
    {
      var tableName = entity.GetTableName();
      if (string.IsNullOrEmpty(tableName))
        continue;

      var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      using (var cmd = conn.CreateCommand())
      {
        cmd.CommandText = $"PRAGMA table_info(`{tableName}`);";
        using var rdr = cmd.ExecuteReader();
        while (rdr.Read())
          existing.Add(rdr.GetString(rdr.GetOrdinal("name")));
      }

      var expected = new HashSet<string>(
          entity.GetProperties()
                .Select(p => p.GetColumnName(StoreObjectIdentifier.Table(tableName, null))!),
          StringComparer.OrdinalIgnoreCase
      );

      if (!existing.SetEquals(expected))
        return false;
    }

    return true;
  }
}