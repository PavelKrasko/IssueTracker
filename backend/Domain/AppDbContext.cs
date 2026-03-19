using Microsoft.EntityFrameworkCore;
namespace IssueTracker.Server.Domain
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<List_Members> ProjectParticipants { get; set; }
        public DbSet<Task> Tasks { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Type_of_defect> Type_of_defects { get; set; }
        public DbSet<Investment> Investments { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<List_Members>()
                .HasKey(pm => new { pm.ProjectId, pm.UserId });
            modelBuilder.Entity<List_Members>()
                .HasOne(pm => pm.Project)
                .WithMany() 
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Restrict); 

            modelBuilder.Entity<List_Members>()
                .HasOne(pm => pm.User)
                .WithMany()
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Task>()
                .HasOne(t => t.Project)
                .WithMany()
                .HasForeignKey(t => t.ProjectId);

            modelBuilder.Entity<Task>()
                .HasOne(t => t.DefectType)
                .WithMany()
                .HasForeignKey(t => t.DefectTypeName);

            modelBuilder.Entity<Task>()
                .HasOne(t => t.Role)
                .WithMany()
                .HasForeignKey(t => t.RoleName);
        }

    }
}