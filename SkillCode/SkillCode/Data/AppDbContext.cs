using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using SkillCode.Models;
using Task = SkillCode.Models.Task;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SkillCode.Enums;
using TaskStatus = System.Threading.Tasks.TaskStatus;

namespace SkillCode.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Attempt> Attempts { get; set; }

    public virtual DbSet<AttemptAnswer> AttemptAnswers { get; set; }

    public virtual DbSet<Group> Groups { get; set; }

    public virtual DbSet<GroupMember> GroupMembers { get; set; }

    public virtual DbSet<GroupTask> GroupTasks { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<SavedTask> SavedTasks { get; set; }

    public virtual DbSet<Task> Tasks { get; set; }

    public virtual DbSet<TaskItem> TaskItems { get; set; }

    public virtual DbSet<TaskShare> TaskShares { get; set; }

    public virtual DbSet<Template> Templates { get; set; }

    public virtual DbSet<TemplateItem> TemplateItems { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("group_role", new[] { "owner", "admin", "member" })
            .HasPostgresEnum("programming_language", new[] { "python", "java", "c#", "c++", "c", "java_script", "type_script", "go", "rust" })
            .HasPostgresEnum("task_status", new[] { "private", "public" })
            .HasPostgresEnum("task_type", new[] { "single_choice", "multi_choice", "matching", "ordering", "fill_blank", "true_false", "open", "flash_cards", "coding" })
            .HasPostgresEnum("type_attempts", new[] { "personal", "public", "saved", "shared", "group" })
            .HasPostgresEnum("user_role", new[] { "user", "admin" })
            .HasPostgresEnum("attempt_status", new[] { "in_progress", "finished" });

        modelBuilder.Entity<Attempt>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("attempts_pkey");

            entity.ToTable("attempts");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.ContextId).HasColumnName("context_id");
            entity.Property(e => e.DurationSeconds).HasColumnName("duration_seconds");
            entity.Property(e => e.EarnedPoints)
                .HasPrecision(5, 2)
                .HasColumnName("earned_points");
            entity.Property(e => e.FinishedAt).HasColumnName("finished_at");
            entity.Property(e => e.MaxPoints)
                .HasPrecision(5, 2)
                .HasColumnName("max_points");
            entity.Property(e => e.StartedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("started_at");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Task).WithMany(p => p.Attempts)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("attempts_task_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Attempts)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("attempts_user_id_fkey");
        });

        modelBuilder.Entity<AttemptAnswer>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("attempt_answers_pkey");

            entity.ToTable("attempt_answers");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AiExplanation).HasColumnName("ai_explanation");
            entity.Property(e => e.AnsweredAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("answered_at");
            entity.Property(e => e.AttemptId).HasColumnName("attempt_id");
            entity.Property(e => e.EarnedPoints)
                .HasPrecision(5, 2)
                .HasColumnName("earned_points");
            entity.Property(e => e.IsCorrect).HasColumnName("is_correct");
            entity.Property(e => e.TaskItemId).HasColumnName("task_item_id");
            entity.Property(e => e.UserAnswer)
                .HasColumnType("jsonb")
                .HasColumnName("user_answer");

            entity.HasOne(d => d.Attempt).WithMany(p => p.AttemptAnswers)
                .HasForeignKey(d => d.AttemptId)
                .HasConstraintName("attempt_answers_attempt_id_fkey");

            entity.HasOne(d => d.TaskItem).WithMany(p => p.AttemptAnswers)
                .HasForeignKey(d => d.TaskItemId)
                .HasConstraintName("attempt_answers_task_item_id_fkey");
        });

        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("groups_pkey");

            entity.ToTable("groups");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Owner).WithMany(p => p.Groups)
                .HasForeignKey(d => d.OwnerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("groups_owner_id_fkey");
        });

        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("group_members_pkey");

            entity.ToTable("group_members");

            entity.HasIndex(e => new { e.GroupId, e.UserId }, "group_members_group_id_user_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.JoinedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("joined_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Group).WithMany(p => p.GroupMembers)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("group_members_group_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.GroupMembers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("group_members_user_id_fkey");
        });

        modelBuilder.Entity<GroupTask>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("group_tasks_pkey");

            entity.ToTable("group_tasks");

            entity.HasIndex(e => new { e.GroupId, e.TaskId }, "group_tasks_group_id_task_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("added_at");
            entity.Property(e => e.CollectResults)
                .HasDefaultValue(true)
                .HasColumnName("collect_results");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.SharedByUserId).HasColumnName("shared_by_user_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");

            entity.HasOne(d => d.Group).WithMany(p => p.GroupTasks)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("group_tasks_group_id_fkey");

            entity.HasOne(d => d.SharedByUser).WithMany(p => p.GroupTasks)
                .HasForeignKey(d => d.SharedByUserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("group_tasks_shared_by_user_id_fkey");

            entity.HasOne(d => d.Task).WithMany(p => p.GroupTasks)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("group_tasks_task_id_fkey");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("refresh_tokens_pkey");

            entity.ToTable("refresh_tokens");

            entity.HasIndex(e => e.TokenHash, "refresh_tokens_token_hash_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.RevokedAt).HasColumnName("revoked_at");
            entity.Property(e => e.TokenHash).HasColumnName("token_hash");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("refresh_tokens_user_id_fkey");
        });

        modelBuilder.Entity<SavedTask>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("saved_tasks_pkey");

            entity.ToTable("saved_tasks");

            entity.HasIndex(e => new { e.UserId, e.TaskId }, "saved_tasks_user_id_task_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.SavedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("saved_at");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Task).WithMany(p => p.SavedTasks)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("saved_tasks_task_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.SavedTasks)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("saved_tasks_user_id_fkey");
        });

        modelBuilder.Entity<Task>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tasks_pkey");

            entity.ToTable("tasks");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AiGenerated)
                .HasDefaultValue(false)
                .HasColumnName("ai_generated");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsCopy)
                .HasDefaultValue(false)
                .HasColumnName("is_copy");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.TemplateId).HasColumnName("template_id");
            entity.Property(e => e.TimeLimitSeconds).HasColumnName("time_limit_seconds");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Owner).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.OwnerId)
                .HasConstraintName("tasks_owner_id_fkey");

            entity.HasOne(d => d.Template).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.TemplateId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("tasks_template_id_fkey");
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("task_items_pkey");

            entity.ToTable("task_items");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CorrectAnswer)
                .HasColumnType("jsonb")
                .HasColumnName("correct_answer");
            entity.Property(e => e.Explanation).HasColumnName("explanation");
            entity.Property(e => e.MultiAnswer)
                .HasDefaultValue(false)
                .HasColumnName("multi_answer");
            entity.Property(e => e.Options)
                .HasColumnType("jsonb")
                .HasColumnName("options");
            entity.Property(e => e.OrderIndex).HasColumnName("order_index");
            entity.Property(e => e.Points)
                .HasPrecision(5, 2)
                .HasDefaultValueSql("1.00")
                .HasColumnName("points");
            entity.Property(e => e.Question).HasColumnName("question");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.TemplateItemId).HasColumnName("template_item_id");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskItems)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("task_items_task_id_fkey");

            entity.HasOne(d => d.TemplateItem).WithMany(p => p.TaskItems)
                .HasForeignKey(d => d.TemplateItemId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("task_items_template_item_id_fkey");
        });

        modelBuilder.Entity<TaskShare>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("task_shares_pkey");

            entity.ToTable("task_shares");

            entity.HasIndex(e => new { e.TaskId, e.SenderId, e.ReceiverId }, "task_shares_task_id_sender_id_receiver_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .HasColumnName("is_read");
            entity.Property(e => e.ReceiverId).HasColumnName("receiver_id");
            entity.Property(e => e.SenderId).HasColumnName("sender_id");
            entity.Property(e => e.SentAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("sent_at");
            entity.Property(e => e.TaskId).HasColumnName("task_id");

            entity.HasOne(d => d.Receiver).WithMany(p => p.TaskShareReceivers)
                .HasForeignKey(d => d.ReceiverId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("task_shares_receiver_id_fkey");

            entity.HasOne(d => d.Sender).WithMany(p => p.TaskShareSenders)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("task_shares_sender_id_fkey");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskShares)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("task_shares_task_id_fkey");
        });

        modelBuilder.Entity<Template>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("templates_pkey");

            entity.ToTable("templates");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsPublic)
                .HasDefaultValue(false)
                .HasColumnName("is_public");
            entity.Property(e => e.IsSystem)
                .HasDefaultValue(false)
                .HasColumnName("is_system");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");

            entity.HasOne(d => d.Owner).WithMany(p => p.Templates)
                .HasForeignKey(d => d.OwnerId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("templates_owner_id_fkey");
        });

        modelBuilder.Entity<TemplateItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("template_items_pkey");

            entity.ToTable("template_items");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Content)
                .HasColumnType("jsonb")
                .HasColumnName("content");
            entity.Property(e => e.OrderIndex).HasColumnName("order_index");
            entity.Property(e => e.TemplateId).HasColumnName("template_id");

            entity.HasOne(d => d.Template).WithMany(p => p.TemplateItems)
                .HasForeignKey(d => d.TemplateId)
                .HasConstraintName("template_items_template_id_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.BlockedUntil).HasColumnName("blocked_until");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.FailedLoginCount)
                .HasDefaultValue(0)
                .HasColumnName("failed_login_count");
            entity.Property(e => e.FirstName)
                .HasMaxLength(100)
                .HasColumnName("first_name");
            entity.Property(e => e.IsBlocked)
                .HasDefaultValue(false)
                .HasColumnName("is_blocked");
            entity.Property(e => e.IsDeleted)
                .HasDefaultValue(false)
                .HasColumnName("is_deleted");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
            entity.Property(e => e.LastName)
                .HasMaxLength(100)
                .HasColumnName("last_name");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        // Enum column names — type conversion is handled by NpgsqlDataSourceBuilder.MapEnum in Program.cs
        modelBuilder.Entity<User>().Property(e => e.Role).HasColumnName("role");
        modelBuilder.Entity<GroupMember>().Property(e => e.Role).HasColumnName("role");
        modelBuilder.Entity<Task>().Property(e => e.Status).HasColumnName("status");
        modelBuilder.Entity<Task>().Property(e => e.Language).HasColumnName("language");
        modelBuilder.Entity<TaskItem>().Property(e => e.Type).HasColumnName("type");
        modelBuilder.Entity<TemplateItem>().Property(e => e.Type).HasColumnName("type");
        modelBuilder.Entity<Attempt>().Property(e => e.ContextType).HasColumnName("context_type");
        modelBuilder.Entity<Attempt>().Property(e => e.Status).HasColumnName("status");

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
