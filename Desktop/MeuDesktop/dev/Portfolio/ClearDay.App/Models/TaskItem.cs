namespace ClearDay.App.Models;

public class TaskItem
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; private set; }
    public DateTime CreatedAt { get; init; } = DateTime.Now;

    public void MarkAsCompleted()
    {
        IsCompleted = true;
    }
}