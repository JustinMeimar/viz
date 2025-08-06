class VizState {
    constructor() {
        this.schedule = [];
        this.networkData = '';
        this.currentScheduleIndex = 0;
        this.isPlaying = false;
        this.searchTerm = '';
    }
    
    setSchedule(schedule) {
        this.schedule = schedule;
    }
    
    setNetworkData(networkData) {
        this.networkData = networkData;
    }
    
    updateScheduleIndex(index) {
        this.currentScheduleIndex = Math.max(0, Math.min(index, this.schedule.length - 1));
    }
}

class CanvasView {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        
        this.setupEventListeners();
        this.resizeCanvas();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMousePos.x;
                const deltaY = e.clientY - this.lastMousePos.y;
                this.camera.x += deltaX;
                this.camera.y += deltaY;
                this.lastMousePos = { x: e.clientX, y: e.clientY };
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom * zoomFactor));
        });
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 60;
    }
}

class App {
    constructor() {
        this.state = new VizState();
        this.canvas = document.getElementById('canvas');
        this.view = new CanvasView(this.canvas);
        
        this.initializeControls();
        this.loadData();
    }
    
    initializeControls() {
        const scheduleSlider = document.getElementById('schedule-slider');
        const speedSlider = document.getElementById('speed-slider');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const searchInput = document.getElementById('search-input');
        
        scheduleSlider.addEventListener('input', (e) => {
            this.state.updateScheduleIndex(parseInt(e.target.value));
        });
        
        playPauseBtn.addEventListener('click', () => {
            this.state.isPlaying = !this.state.isPlaying;
            playPauseBtn.textContent = this.state.isPlaying ? 'Pause' : 'Play';
        });
        
        searchInput.addEventListener('input', (e) => {
            this.state.searchTerm = e.target.value;
        });
    }
    
    async loadData() {
        try {
            const [scheduleResponse, networkResponse] = await Promise.all([
                fetch('/schedule.json'),
                fetch('/network.dot')
            ]);
            
            const scheduleData = await scheduleResponse.json();
            const networkData = await networkResponse.text();
            
            console.log('Loaded schedule data:', scheduleData);
            console.log('Loaded network data:', networkData);
            
            this.state.setSchedule(scheduleData.schedule);
            this.state.setNetworkData(networkData);
            
            const scheduleSlider = document.getElementById('schedule-slider');
            scheduleSlider.max = scheduleData.schedule.length - 1;
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});