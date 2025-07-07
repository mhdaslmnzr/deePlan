// Firebase Configuration - imported from separate file
// The firebaseConfig is now loaded from js/firebase-config.js

// Global variables
let tasks = [];
let editingTaskId = null;
let currentView = 'list';
let firebase = null;
let database = null;
let auth = null;
let tasksRef = null;

// DOM Elements - will be initialized after DOM loads
let elements = {};

// Initialize DOM elements
function initializeElements() {
    elements = {
        currentDateTime: document.getElementById('currentDateTime'),
        firebaseStatus: document.getElementById('firebaseStatus'),
        pendingCount: document.getElementById('pendingCount'),
        completedCount: document.getElementById('completedCount'),
        todayTasksCount: document.getElementById('todayTasksCount'),
        todayTasksList: document.getElementById('todayTasksList'),
        noTodayTasksMessage: document.getElementById('noTodayTasksMessage'),
        tasks: document.getElementById('tasks'),
        noTasksMessage: document.getElementById('noTasksMessage'),
        taskModal: document.getElementById('taskModal'),
        listViewBtn: document.getElementById('listViewBtn'),
        completedViewBtn: document.getElementById('completedViewBtn'),
        addTaskButton: document.getElementById('addTaskButton'),
        errorMessage: document.getElementById('errorMessage'),
        spinner: document.getElementById('loadingSpinner')
    };
}

// Wait for Firebase to be available
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        const checkFirebase = () => {
            attempts++;
            if (window.firebase) {
                firebase = window.firebase;
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Firebase failed to load within 5 seconds'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize Firebase connection
async function initializeFirebase() {
    try {
        // Wait for Firebase to be loaded
        await waitForFirebase();
        
        // Initialize Firebase services
        const app = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        auth = firebase.auth();
        tasksRef = firebase.ref(database, 'tasks');
        
        // Sign in anonymously
        await firebase.signInAnonymously(auth);
        showFirebaseStatus('🟢 Connected to Firebase', 'bg-green-500');
        console.log('Successfully connected to Firebase');
        
        // Test database connection
        try {
            const testSnapshot = await firebase.get(firebase.ref(database, '.info/connected'));
            console.log('Database connection test:', testSnapshot.val());
        } catch (dbError) {
            console.warn('Database connection warning:', dbError);
        }
        
        return true;
    } catch (error) {
        console.error('Firebase connection error:', error);
        
        // Check if it's a configuration error
        if (error.code === 'auth/invalid-api-key' || error.code === 'auth/network-request-failed') {
            showFirebaseStatus('🔴 Firebase configuration error. Using offline mode.', 'bg-red-500');
        } else {
            showFirebaseStatus(`🔴 Firebase Error: ${error.message}`, 'bg-red-500');
        }
        
        // Fallback to local storage
        setTimeout(() => {
            showFirebaseStatus('🟡 Using offline mode (local storage)', 'bg-yellow-500');
        }, 3000);
        
        return false;
    }
}

// Show Firebase status
function showFirebaseStatus(message, bgClass) {
    if (!elements.firebaseStatus) return;
    
    elements.firebaseStatus.textContent = message;
    elements.firebaseStatus.className = `fixed top-4 right-4 ${bgClass} text-white px-3 py-1 rounded text-sm z-50`;
    elements.firebaseStatus.classList.remove('hidden');
    
    setTimeout(() => {
        elements.firebaseStatus.classList.add('hidden');
    }, 5000);
}

// Update date and time
function updateDateTime() {
    if (!elements.currentDateTime) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const dateTimeString = now.toLocaleString('en-US', options);
    elements.currentDateTime.textContent = dateTimeString;
}

// Show error message
function showError(message) {
    if (!elements.errorMessage) return;
    
    const span = elements.errorMessage.querySelector('span');
    if (span) {
        span.textContent = message;
    }
    elements.errorMessage.classList.remove('hidden');
    setTimeout(() => {
        elements.errorMessage.classList.add('hidden');
    }, 3000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50 animate-bounce-in';
    successDiv.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

// Get due date color
function getDueDateColor(dueDate) {
    if (!dueDate) return 'text-gray-500';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600 font-bold'; // Overdue
    if (diffDays === 0) return 'text-blue-600 font-bold'; // Today
    if (diffDays <= 2) return 'text-yellow-600 font-bold'; // 1-2 days
    return 'text-green-600'; // 3+ days
}

// Get due date text
function getDueDateText(dueDate) {
    if (!dueDate) return 'No due date';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `⚠️ Overdue: ${due.toLocaleDateString()}`;
    if (diffDays === 0) return `📅 Today: ${due.toLocaleDateString()}`;
    if (diffDays === 1) return `📅 Tomorrow: ${due.toLocaleDateString()}`;
    if (diffDays <= 7) return `📅 In ${diffDays} days: ${due.toLocaleDateString()}`;
    return `📅 ${due.toLocaleDateString()}`;
}

// Create task modal
function createTaskModal() {
    const modalContent = `
        <div class="p-6 border-b border-gray-100">
            <h2 id="modalTitle" class="text-2xl font-bold text-gray-800">Add New Task</h2>
            <p class="text-gray-600 mt-1">Stay organized and productive</p>
        </div>
        
        <form id="taskForm" class="p-6 space-y-6">
            <div>
                <label class="block text-gray-700 font-medium mb-2">Task Name</label>
                <textarea 
                    id="taskName" 
                    rows="3" 
                    class="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="What needs to be done?"
                    required
                ></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 font-medium mb-2">Due Date</label>
                    <input 
                        type="date" 
                        id="taskDate" 
                        class="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                </div>
                
                <div>
                    <label class="block text-gray-700 font-medium mb-2">Description (Optional)</label>
                    <textarea 
                        id="taskDescription" 
                        rows="2" 
                        class="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        placeholder="Add more details..."
                    ></textarea>
                </div>
            </div>
            
            <div class="flex space-x-3">
                <button 
                    type="button" 
                    id="cancelButton" 
                    class="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    id="submitButton" 
                    class="flex-1 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                    Add Task
                </button>
            </div>
        </form>
    `;
    
    const modal = document.getElementById('taskModal');
    modal.querySelector('.bg-white').innerHTML = modalContent;
}

// Open modal
function openModal(task = null) {
    elements.taskModal.classList.remove('hidden');
    elements.taskModal.classList.add('flex');
    elements.errorMessage.classList.add('hidden');
    
    if (task) {
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskDate').value = task.date || '';
        document.getElementById('taskDescription').value = task.description || '';
        editingTaskId = task.id;
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('submitButton').textContent = 'Update Task';
    } else {
        document.getElementById('taskForm').reset();
        editingTaskId = null;
        document.getElementById('modalTitle').textContent = 'Add New Task';
        document.getElementById('submitButton').textContent = 'Add Task';
    }
}

// Close modal
function closeModal() {
    elements.taskModal.classList.add('hidden');
    elements.taskModal.classList.remove('flex');
    elements.errorMessage.classList.add('hidden');
    editingTaskId = null;
}

// Fetch tasks from Firebase
async function fetchTasks() {
    try {
        if (elements.spinner) elements.spinner.classList.remove('hidden');
        console.log('🔄 Fetching tasks from Firebase...');
        console.log('TasksRef:', tasksRef);
        
        if (!tasksRef) {
            console.error('❌ TasksRef is null or undefined');
            return;
        }
        
        const snapshot = await firebase.get(tasksRef);
        console.log('📊 Firebase snapshot:', snapshot);
        console.log('📊 Snapshot exists:', snapshot.exists());
        console.log('📊 Snapshot value:', snapshot.val());
        
        tasks = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const task = { id: childSnapshot.key, ...childSnapshot.val() };
                tasks.push(task);
                console.log('📝 Loaded task:', task);
            });
        } else {
            console.log('📭 Snapshot exists but is empty');
        }
        
        console.log('📋 Total tasks loaded:', tasks.length);
        console.log('📋 Tasks array:', tasks);
        
        // If no tasks exist, create some sample tasks for testing
        if (tasks.length === 0) {
            console.log('📭 No tasks found, creating sample tasks...');
            await createSampleTasks();
        }
        
        renderTasks();
        updateStats();
    } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        console.error('❌ Error details:', error.message, error.code);
        showError('Failed to load tasks');
    } finally {
        if (elements.spinner) elements.spinner.classList.add('hidden');
    }
}

// Create sample tasks for testing
async function createSampleTasks() {
    const sampleTasks = [
        {
            name: 'Complete project presentation',
            description: 'Finish the slides for the quarterly review',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            name: 'Buy groceries',
            description: 'Milk, bread, eggs, and vegetables',
            date: new Date().toISOString().split('T')[0], // Today
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            name: 'Call mom',
            description: 'Weekly check-in call',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            name: 'Exercise',
            description: '30 minutes cardio workout',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday (overdue)
            completed: false,
            createdAt: new Date().toISOString()
        }
    ];
    
    try {
        for (const task of sampleTasks) {
            const newTaskRef = firebase.push(tasksRef);
            await firebase.set(newTaskRef, task);
        }
        console.log('Sample tasks created successfully');
    } catch (error) {
        console.error('Error creating sample tasks:', error);
    }
}

// Update statistics
function updateStats() {
    const pendingTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);
    const todayTasks = tasks.filter(task => {
        if (task.completed || !task.date) return false;
        const taskDate = new Date(task.date);
        const today = new Date();
        return taskDate.toDateString() === today.toDateString();
    });

    elements.pendingCount.textContent = pendingTasks.length;
    elements.completedCount.textContent = completedTasks.length;
    elements.todayTasksCount.textContent = `${todayTasks.length} task${todayTasks.length !== 1 ? 's' : ''}`;
}

// Search and filter tasks
function filterAndSortTasks(tasks) {
    // Only sort by soonest deadline (ascending by date)
    return tasks.slice().sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
    });
}

// Render tasks
function renderTasks() {
    const filteredTasks = filterAndSortTasks(tasks);
    const pendingTasks = filteredTasks.filter(task => !task.completed);
    const completedTasks = filteredTasks.filter(task => task.completed);
    const todayTasks = tasks.filter(task => {
        if (task.completed || !task.date) return false;
        const taskDate = new Date(task.date);
        const today = new Date();
        return taskDate.toDateString() === today.toDateString();
    });

    // Render today's tasks
    renderTodayTasks(todayTasks);
    
    // Render all tasks based on current view
    if (currentView === 'completed') {
        renderCompletedTasks(completedTasks);
    } else {
        renderAllTasks(pendingTasks, completedTasks);
    }
}

// Render today's tasks
function renderTodayTasks(todayTasks) {
    elements.todayTasksList.innerHTML = '';
    
    if (todayTasks.length === 0) {
        elements.noTodayTasksMessage.classList.remove('hidden');
    } else {
        elements.noTodayTasksMessage.classList.add('hidden');
        todayTasks.forEach(task => {
            const taskElement = createTaskElement(task, false, true);
            elements.todayTasksList.appendChild(taskElement);
        });
    }
}

// Render all tasks
function renderAllTasks(pendingTasks, completedTasks) {
    elements.tasks.innerHTML = '';
    
    if (tasks.length === 0) {
        elements.noTasksMessage.classList.remove('hidden');
        elements.noTasksMessage.innerHTML = `
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span style="font-size:2.5rem;">🦄</span>
            </div>
            <p class="text-gray-500 mb-2">No tasks yet</p>
            <p class="text-sm text-gray-400">Tap the + button to add your first magical task!</p>
        `;
    } else {
        elements.noTasksMessage.classList.add('hidden');
        
        if (pendingTasks.length > 0) {
            renderTaskGroup('Pending Tasks', pendingTasks, elements.tasks, false);
        }
        // Removed Recently Completed section
    }
}

// Render completed tasks view
function renderCompletedTasks(completedTasks) {
    elements.tasks.innerHTML = '';
    
    if (completedTasks.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'text-center py-12';
        emptyMessage.innerHTML = `
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span style="font-size:2.5rem;">🎉</span>
            </div>
            <p class="text-gray-500 mb-2">No completed tasks yet</p>
            <p class="text-sm text-gray-400">Complete some tasks to see them here!</p>
        `;
        elements.tasks.appendChild(emptyMessage);
    } else {
        renderTaskGroup('Completed Tasks', completedTasks, elements.tasks, true);
    }
}

// Render task group
function renderTaskGroup(title, tasks, container, isCompleted) {
    const groupContainer = document.createElement('div');
    groupContainer.className = 'mb-8';
    
    const groupTitle = document.createElement('h3');
    groupTitle.className = 'section-title flex items-center';
    groupTitle.innerHTML = `
        <span>${title}</span>
        <span class="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">${tasks.length}</span>
    `;
    groupContainer.appendChild(groupTitle);
    
    if (tasks.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'text-gray-500 text-center py-8';
        emptyMessage.innerHTML = 'No pending tasks. <span style="font-size:1.5rem;">✨</span>';
        groupContainer.appendChild(emptyMessage);
    } else {
        const tasksGrid = document.createElement('div');
        tasksGrid.className = 'space-y-3';
        
        tasks.forEach(task => {
            const taskElement = createTaskElement(task, isCompleted, false);
            tasksGrid.appendChild(taskElement);
        });
        
        groupContainer.appendChild(tasksGrid);
    }
    
    container.appendChild(groupContainer);
}

// Create task element
function createTaskElement(task, isCompleted, isToday = false) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-card bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 ${isCompleted ? 'opacity-75' : ''}`;
    
    const taskContent = `
        <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                        <input type="checkbox" 
                               class="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
                               ${isCompleted ? 'checked' : ''} 
                               onchange="window.toggleTaskCompletion('${task.id}', this.checked)">
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-gray-800 ${isCompleted ? 'line-through' : ''} mb-1">
                            ${task.name}
                        </h4>
                        
                        ${task.description ? `<p class="text-sm text-gray-600 mb-2">${task.description}</p>` : ''}
                        
                        <div class="flex items-center space-x-3 text-sm">
                            <span class="due-badge ${getDueDateColor(task.date)}">${getDueDateText(task.date)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex items-center space-x-2 ml-4">
                ${!isCompleted ? `
                    <button onclick="window.completeTask('${task.id}')" 
                            class="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors" 
                            title="Mark as complete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </button>
                ` : ''}
                
                <button onclick="window.openModalForEdit('${task.id}')" 
                        class="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors" 
                        title="Edit task">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                
                <button onclick="window.deleteTask('${task.id}')" 
                        class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors" 
                        title="Delete task">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    taskElement.innerHTML = taskContent;
    // Add fade-in animation
    taskElement.classList.add('fade-in');
    // Make the card clickable to edit, except for checkbox and action buttons
    taskElement.addEventListener('click', function(e) {
        if (
            e.target.closest('input[type="checkbox"]') ||
            e.target.closest('button') ||
            e.target.closest('svg')
        ) {
            return;
        }
        window.openModalForEdit(task.id);
    });
    return taskElement;
}

// Toggle task completion
async function toggleTaskCompletion(taskId, completed) {
    try {
        if (firebase && database) {
            const taskRef = firebase.ref(database, `tasks/${taskId}`);
            await firebase.update(taskRef, { 
                completed: completed,
                completedDate: completed ? new Date().toISOString() : null
            });
            await fetchTasks();
        } else {
            // Local storage fallback
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].completed = completed;
                tasks[taskIndex].completedDate = completed ? new Date().toISOString() : null;
                saveTasksToLocalStorage();
                renderTasks();
                updateStats();
            }
        }
        showSuccess(completed ? 'Task completed! 🎉' : 'Task marked as pending');
    } catch (error) {
        console.error('Error toggling task:', error);
        showError('Failed to update task');
    }
}

// Complete task
async function completeTask(taskId) {
    await toggleTaskCompletion(taskId, true);
}

// Delete task
async function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            if (firebase && database) {
                const taskRef = firebase.ref(database, `tasks/${taskId}`);
                await firebase.remove(taskRef);
                await fetchTasks();
            } else {
                // Local storage fallback
                tasks = tasks.filter(t => t.id !== taskId);
                saveTasksToLocalStorage();
                renderTasks();
                updateStats();
            }
            showSuccess('Task deleted successfully');
        } catch (error) {
            console.error('Error deleting task:', error);
            showError('Failed to delete task');
        }
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const taskName = document.getElementById('taskName').value.trim();
    const taskDate = document.getElementById('taskDate').value;
    const taskDescription = document.getElementById('taskDescription').value.trim();
    
    if (!taskName) {
        showError('Please enter a task name');
        return;
    }
    if (!taskDate) {
        showError('Please select a due date');
        return;
    }
    try {
        const taskData = {
            name: taskName,
            date: taskDate,
            description: taskDescription,
            updatedAt: new Date().toISOString()
        };
        
        if (editingTaskId) {
            if (firebase && database) {
                const taskRef = firebase.ref(database, `tasks/${editingTaskId}`);
                await firebase.update(taskRef, taskData);
                await fetchTasks();
            } else {
                // Local storage fallback
                const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
                    saveTasksToLocalStorage();
                    renderTasks();
                    updateStats();
                }
            }
            showSuccess('Task updated successfully! ✨');
        } else {
            taskData.completed = false;
            taskData.createdAt = new Date().toISOString();
            
            if (firebase && tasksRef) {
                const newTaskRef = firebase.push(tasksRef);
                await firebase.set(newTaskRef, taskData);
                await fetchTasks();
            } else {
                // Local storage fallback
                taskData.id = Date.now().toString();
                tasks.push(taskData);
                saveTasksToLocalStorage();
                renderTasks();
                updateStats();
            }
            showSuccess('Task added successfully! 🎉');
        }
        
        closeModal();
    } catch (error) {
        console.error('Error saving task:', error);
        showError('Failed to save task');
    }
}

// Event listeners
function setupEventListeners() {
    // Add task button
    if (elements.addTaskButton) {
        elements.addTaskButton.addEventListener('click', () => openModal());
    }
    
    // View toggle
    if (elements.listViewBtn) {
        elements.listViewBtn.addEventListener('click', () => {
            currentView = 'list';
            elements.listViewBtn.className = 'px-3 py-1 rounded-lg bg-primary-600 text-white text-sm font-medium';
            elements.completedViewBtn.className = 'px-3 py-1 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300';
            renderTasks();
        });
    }
    
    if (elements.completedViewBtn) {
        elements.completedViewBtn.addEventListener('click', () => {
            currentView = 'completed';
            elements.completedViewBtn.className = 'px-3 py-1 rounded-lg bg-primary-600 text-white text-sm font-medium';
            elements.listViewBtn.className = 'px-3 py-1 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300';
            renderTasks();
        });
    }
    
    // Modal event listeners
    if (elements.taskModal) {
        elements.taskModal.addEventListener('click', (e) => {
            if (e.target === elements.taskModal) {
                closeModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.taskModal && !elements.taskModal.classList.contains('hidden')) {
            closeModal();
        }
    });
    
    // Form submission - will be set up after modal is created
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'taskForm') {
            e.preventDefault();
            handleFormSubmit(e);
        }
    });
    
    // Cancel button
    document.addEventListener('click', (e) => {
        if (e.target.id === 'cancelButton') {
            e.preventDefault();
            closeModal();
        }
    });
}

// Initialize app
async function initializeApp() {
    try {
        // Initialize DOM elements first
        initializeElements();
        
        const firebaseConnected = await initializeFirebase();
        
        if (!firebaseConnected) {
            // Load tasks from local storage if Firebase is not available
            loadTasksFromLocalStorage();
        }
        
        createTaskModal();
        setupEventListeners();
        updateDateTime();
        setInterval(updateDateTime, 60000); // Update every minute
        
        // Make functions available globally for onclick handlers
        window.toggleTaskCompletion = toggleTaskCompletion;
        window.completeTask = completeTask;
        window.deleteTask = deleteTask;
        window.openModalForEdit = (taskId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                openModal(task);
            }
        };
        
        if (firebaseConnected) {
            await fetchTasks();
        } else {
            renderTasks();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize app. Please refresh the page.');
    }
}

// Load tasks from local storage (fallback)
function loadTasksFromLocalStorage() {
    try {
        const storedTasks = localStorage.getItem('deeplan-tasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        } else {
            // Create sample tasks for offline mode
            tasks = [
                {
                    id: '1',
                    name: 'Complete project presentation',
                    description: 'Finish the slides for the quarterly review',
                    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    completed: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: 'Buy groceries',
                    description: 'Milk, bread, eggs, and vegetables',
                    date: new Date().toISOString().split('T')[0],
                    completed: false,
                    createdAt: new Date().toISOString()
                }
            ];
            saveTasksToLocalStorage();
        }
    } catch (error) {
        console.error('Error loading tasks from local storage:', error);
        tasks = [];
    }
}

// Save tasks to local storage
function saveTasksToLocalStorage() {
    try {
        localStorage.setItem('deeplan-tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks to local storage:', error);
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
