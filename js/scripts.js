document.addEventListener('DOMContentLoaded', function() {
    const tasks = [];

    const taskContainer = document.getElementById('tasks');
    const addTaskButton = document.getElementById('addTaskButton');
    const taskModal = document.getElementById('taskModal');
    const cancelButton = document.getElementById('cancelButton');
    const taskForm = document.getElementById('taskForm');
    const errorMessage = document.getElementById('errorMessage');
    const noTasksMessage = document.getElementById('noTasksMessage');

    // Show the task modal when the "+" button is clicked
    addTaskButton.addEventListener('click', () => {
        taskModal.classList.remove('hidden');
        errorMessage.classList.add('hidden');  // Reset the error message
    });

    // Close the task modal when the "Cancel" button is clicked
    cancelButton.addEventListener('click', () => {
        taskModal.classList.add('hidden');
        errorMessage.classList.add('hidden');  // Reset the error message
    });

    // Handle task form submission
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskName = document.getElementById('taskName').value;
        const taskDate = document.getElementById('taskDate').value;

        if (taskName) {
            errorMessage.classList.add('hidden');  // Hide error message
            tasks.push({ name: taskName, date: taskDate, completed: false });
            renderTasks();
            taskForm.reset();
            taskModal.classList.add('hidden');
        } else {
            errorMessage.classList.remove('hidden');  // Show error message
        }
    });

    function renderTasks() {
        taskContainer.innerHTML = '';
        if (tasks.length === 0) {
            noTasksMessage.classList.remove('hidden');
        } else {
            noTasksMessage.classList.add('hidden');
            tasks.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed - b.completed;  // Incomplete tasks first
                }
                return new Date(b.date) - new Date(a.date);  // Recently added tasks first
            }).forEach(task => {
                const taskElement = document.createElement('div');
                const currentDate = new Date();
                const taskDate = new Date(task.date);
                let daysLeft = Math.ceil((taskDate - currentDate) / (1000 * 60 * 60 * 24));
                let dueClass = '';

                if (task.completed) {
                    dueClass = 'task-completed';
                } else {
                    if (daysLeft < 0) {
                        dueClass = 'overdue';
                        daysLeft = 'Overdue';
                    } else if (daysLeft === 0) {
                        dueClass = 'due-today';
                        daysLeft = 'Due today';
                    } else if (daysLeft === 1) {
                        dueClass = 'due-tomorrow';
                        daysLeft = 'Due tomorrow';
                    } else {
                        dueClass = 'due-later';
                        daysLeft = `Due in ${daysLeft} days`;
                    }
                }

                taskElement.className = `flex justify-between items-center border-b border-slate-200 py-3 px-2 border-l-4 ${dueClass} task-list-item task-list-gap`;
                taskElement.innerHTML = `
                    <div class="inline-flex items-center space-x-2">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-slate-500 hover:text-indigo-600 hover:cursor-pointer complete-icon">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div class="${task.completed ? 'line-through text-slate-500' : ''}">${task.name}</div>
                    </div>
                    <div class="flex space-x-4 items-center">
                        <span class="text-xs ${dueClass}">${daysLeft || 'No Due Date'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-red-500 hover:text-red-700 hover:cursor-pointer delete-icon">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                `;

                // Handle task completion
                taskElement.querySelector('.complete-icon').addEventListener('click', () => {
                    task.completed = !task.completed;
                    renderTasks();
                });

                // Handle task deletion
                taskElement.querySelector('.delete-icon').addEventListener('click', () => {
                    tasks.splice(tasks.indexOf(task), 1);
                    renderTasks();
                });

                taskContainer.appendChild(taskElement);
            });
        }
    }

    renderTasks();
});
