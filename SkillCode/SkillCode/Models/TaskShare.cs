using System;
using System.Collections.Generic;

namespace SkillCode.Models;

public partial class TaskShare
{
    public Guid Id { get; set; }

    public Guid TaskId { get; set; }

    public Guid? SenderId { get; set; }

    public Guid? ReceiverId { get; set; }

    public bool IsRead { get; set; }

    public DateTime SentAt { get; set; }

    public virtual User? Receiver { get; set; }

    public virtual User? Sender { get; set; }

    public virtual Task Task { get; set; } = null!;
}
