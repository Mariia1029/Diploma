using System;
using System.Collections.Generic;
using SkillCode.Enums;

namespace SkillCode.Models;

public partial class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string FirstName { get; set; } = null!;

    public string LastName { get; set; } = null!;
    
    public UserRole Role { get; set; }

    public int FailedLoginCount { get; set; }

    public bool IsBlocked { get; set; }

    public DateTime? BlockedUntil { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Attempt> Attempts { get; set; } = new List<Attempt>();

    public virtual ICollection<GroupMember> GroupMembers { get; set; } = new List<GroupMember>();

    public virtual ICollection<GroupTask> GroupTasks { get; set; } = new List<GroupTask>();

    public virtual ICollection<Group> Groups { get; set; } = new List<Group>();

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public virtual ICollection<SavedTask> SavedTasks { get; set; } = new List<SavedTask>();

    public virtual ICollection<TaskShare> TaskShareReceivers { get; set; } = new List<TaskShare>();

    public virtual ICollection<TaskShare> TaskShareSenders { get; set; } = new List<TaskShare>();

    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();

    public virtual ICollection<Template> Templates { get; set; } = new List<Template>();
}
