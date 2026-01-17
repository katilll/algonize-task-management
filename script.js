// --- INIT & STATE ---
let tasks = JSON.parse(localStorage.getItem('nexusTasks')) || [];
let currentFilter = 'all';

// --- MOCK DATA GENERATOR (For Empty States) ---
function generateMockData(type) {
    const urgentMocks = [
        { id: 101, title: "Server Migration - Production DB", priority: "high", date: "2025-10-24", tags: "DevOps, Critical", completed: false },
        { id: 102, title: "Patch Security Vulnerability CVE-2025", priority: "high", date: "2025-10-25", tags: "Security", completed: false },
        { id: 103, title: "Client Presentation - Q4 Roadmap", priority: "high", date: "2025-10-26", tags: "Business", completed: false },
        { id: 104, title: "Fix Payment Gateway API Error", priority: "high", date: "2025-10-24", tags: "Backend, Urgent", completed: false }
    ];

    const completedMocks = [
        { id: 201, title: "UI Redesign - Dashboard", priority: "medium", date: "2025-09-10", tags: "Design", completed: true },
        { id: 202, title: "Team Quarterly Review", priority: "low", date: "2025-09-15", tags: "HR", completed: true },
        { id: 203, title: "Optimize Image Assets", priority: "low", date: "2025-09-12", tags: "Frontend", completed: true },
        { id: 204, title: "Setup CI/CD Pipeline", priority: "high", date: "2025-09-01", tags: "DevOps", completed: true }
    ];

    if (type === 'urgent') return urgentMocks;
    if (type === 'completed') return completedMocks;
    return [];
}

// --- VIEW NAVIGATION ---
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

    // Show selected view
    document.getElementById(`view-${viewName}`).style.display = 'block';
    
    // Update Active Nav
    if(viewName === 'dashboard') {
        document.getElementById('nav-dashboard').classList.add('active');
        renderTasks(); // Refresh tasks
    } else if(viewName === 'analytics') {
        document.getElementById('nav-analytics').classList.add('active');
        renderAnalytics(); // Load graph
    }

    if(window.innerWidth <= 768) toggleSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// --- DASHBOARD LOGIC ---
function renderTasks() {
    const feed = document.getElementById('taskFeed');
    feed.innerHTML = '';

    let filtered = tasks;

    // --- SMART DATA INJECTION ---
    // If filter is 'urgent' and no urgent tasks exist, show mocks
    if (currentFilter === 'urgent') {
        const realUrgent = tasks.filter(t => t.priority === 'high' && !t.completed);
        filtered = realUrgent.length > 0 ? realUrgent : generateMockData('urgent');
    } 
    // If filter is 'completed' and no completed tasks exist, show mocks
    else if (currentFilter === 'completed') {
        const realCompleted = tasks.filter(t => t.completed);
        filtered = realCompleted.length > 0 ? realCompleted : generateMockData('completed');
    } 
    // Default 'all' filter
    else {
        filtered = tasks;
    }

    // Update Metrics (Real data only)
    document.getElementById('countTotal').innerText = tasks.length;
    document.getElementById('countActive').innerText = tasks.filter(t => !t.completed).length;
    document.getElementById('countDone').innerText = tasks.filter(t => t.completed).length;

    // Render list
    filtered.forEach(task => {
        const el = document.createElement('div');
        el.className = `task-item p-${task.priority} ${task.completed ? 'completed' : ''}`;
        el.innerHTML = `
            <div class="task-info">
                <h3>${task.title}</h3>
                <div class="tags">
                    ${task.tags ? `<span>${task.tags}</span>` : ''} 
                    <span>${task.date || 'No Date'}</span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="toggleTask(${task.id})" title="Toggle Status">
                    <i class="fa-solid ${task.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
                </button>
                <button onclick="deleteTask(${task.id})" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        feed.appendChild(el);
    });
    
    // GSAP Animation
    gsap.from(".task-item", { opacity: 0, y: 20, duration: 0.4, stagger: 0.1 });
}

// --- ANALYTICS LOGIC (Chart.js) ---
let myChart = null;

function renderAnalytics() {
    const ctx = document.getElementById('taskChart').getContext('2d');
    
    // Calculate Stats
    const high = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    const medium = tasks.filter(t => t.priority === 'medium' && !t.completed).length;
    const low = tasks.filter(t => t.priority === 'low' && !t.completed).length;
    const done = tasks.filter(t => t.completed).length;

    // Update Text Stats
    document.getElementById('statUrgent').innerText = high;
    document.getElementById('statMedium').innerText = medium;
    document.getElementById('statLow').innerText = low;

    // Destroy old chart if exists
    if(myChart) myChart.destroy();

    // Create New Chart
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'Medium', 'Low', 'Completed'],
            datasets: [{
                data: [high, medium, low, done],
                backgroundColor: ['#ff0055', '#00f2ff', '#00ff9d', '#444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#fff' } }
            }
        }
    });
}

// --- TASK ACTIONS ---
const modal = document.getElementById('modalOverlay');
document.getElementById('openModalBtn').onclick = () => modal.classList.add('active');
document.getElementById('closeModalBtn').onclick = () => modal.classList.remove('active');

document.getElementById('taskForm').onsubmit = (e) => {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value;
    const priority = document.getElementById('taskPriority').value;
    const date = document.getElementById('taskDate').value;
    const tags = document.getElementById('taskTags').value;
    
    const newTask = { id: Date.now(), title, priority, date, tags, completed: false };
    tasks.unshift(newTask);
    save();
    
    document.getElementById('taskForm').reset();
    modal.classList.remove('active');
    
    // If in analytics view, refresh analytics, else refresh dashboard
    if(document.getElementById('view-analytics').style.display === 'block') {
        renderAnalytics();
    } else {
        renderTasks();
    }
};

window.toggleTask = (id) => {
    // Check if it's a mock task (ID < 1000 usually)
    if(id < 1000) {
        alert("System Notice: This is a simulation protocol (Mock Data). Create a real task to interact.");
        return;
    }
    tasks = tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t);
    save();
    renderTasks();
};

window.deleteTask = (id) => {
    if(id < 1000) {
        alert("System Notice: Cannot delete simulation data.");
        return;
    }
    if(confirm("Purge protocol from database?")) {
        tasks = tasks.filter(t => t.id !== id);
        save();
        renderTasks();
    }
};

function save() {
    localStorage.setItem('nexusTasks', JSON.stringify(tasks));
}

// --- FILTER BUTTON LOGIC ---
document.querySelectorAll('.menu-item.sub-item').forEach(btn => {
    btn.onclick = function() {
        // Reset styles
        document.querySelectorAll('.menu-item.sub-item').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Switch to Dashboard View automatically
        switchView('dashboard');

        // Set Filter
        currentFilter = this.getAttribute('data-filter');
        renderTasks();
        
        if(window.innerWidth <= 768) toggleSidebar();
    }
});

// --- AI CHATBOT & NOTEPAD (Existing Logic) ---
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');

function toggleChat() { chatWindow.classList.toggle('active'); }
function toggleNotepad() { document.getElementById('notepadPanel').classList.toggle('active'); }

function sendMessage() {
    const text = chatInput.value.trim();
    if(!text) return;
    addMessage(text, 'user');
    chatInput.value = '';
    setTimeout(() => {
        addMessage("I have processed that request. Is there anything else?", 'bot');
    }, 1000);
}
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.innerHTML = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

// --- NOISE BACKGROUND ---
const canvas = document.getElementById('noiseCanvas');
const ctx = canvas.getContext('2d');
const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.addEventListener('resize', resize);
resize();
function noise() {
    const w = canvas.width, h = canvas.height;
    const idata = ctx.createImageData(w, h);
    const buffer32 = new Uint32Array(idata.data.buffer);
    for(let i=0; i<buffer32.length; i++) if(Math.random()<0.05) buffer32[i]=0xffffffff;
    ctx.putImageData(idata, 0, 0);
    requestAnimationFrame(noise);
}
noise();

// INITIAL RENDER
renderTasks();