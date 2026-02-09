using ClearDay.App.Interfaces;
using ClearDay.App.Models;

namespace ClearDay.App.Services;

public class TaskService : ITaskService
{
    private readonly List<TaskItem> _tasks = new();

    public void AddTask(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Task title cannot be empty.");

        _tasks.Add(new TaskItem { Title = title });
    }

    public List<TaskItem> GetAllTasks()
    {
        return _tasks;
    }

    public void CompleteTask(Guid taskId)
    {
        var task = _tasks.FirstOrDefault(t => t.Id == taskId);

        if (task is null)
            throw new InvalidOperationException("Task not found.");

        task.MarkAsCompleted();
    }
}