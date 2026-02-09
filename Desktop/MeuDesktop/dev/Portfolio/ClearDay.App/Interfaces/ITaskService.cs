using ClearDay.App.Models;

namespace ClearDay.App.Interfaces;

public interface ITaskService
{
    void AddTask(string title);
    List<TaskItem> GetAllTasks();
    void CompleteTask(Guid taskId);
}