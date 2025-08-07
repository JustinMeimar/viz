class Node {
    constructor(id, label, x = 0, y = 0) {
        this.id = id;
        this.label = label;
        this.x = x;
        this.y = y;
        this.width = Math.max(80, label.length * 12 + 20);
        this.height = 40;
        this.color = '#f5f5f5';
        this.borderColor = '#9e9e9e';
        this.textColor = '#333';
        this.highlighted = false;
        this.scheduled = false;
        this.hovered = false;
        this.selected = false;
    }
    
    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
    }
    
    containsPoint(x, y) {
        const bounds = this.getBounds();
        return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    }
}

class Edge {
    constructor(fromId, toId) {
        this.fromId = fromId;
        this.toId = toId;
        this.color = '#bdbdbd';
        this.width = 2;
        this.highlighted = false;
        this.selected = false;
    }
}

class DotParser {
    static parse(dotContent) {
        const nodes = new Map();
        const edges = [];
        
        const lines = dotContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        for (const line of lines) {
            if (line.includes('[id=')) {
                const match = line.match(/(\w+)(?:_(\d+))?\s*\[id="(\d+)"\]/);
                if (match) {
                    const [, opCode, , id] = match;
                    const label = line.split(' ')[0];
                    nodes.set(id, new Node(id, label));
                }
            } else if (line.includes('->')) {
                const match = line.match(/(\w+)(?:_(\d+))?\s*->\s*(\w+)(?:_(\d+))?/);
                if (match) {
                    const fromLabel = match[0].split(' -> ')[0].trim();
                    const toLabel = match[0].split(' -> ')[1].replace(';', '').trim();
                    
                    const fromId = fromLabel.split('_').pop();
                    const toId = toLabel.split('_').pop();
                    
                    edges.push(new Edge(fromId, toId));
                }
            }
        }
        
        return { nodes, edges };
    }
}

class GraphModel {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    
    setGraphData(dotContent) {
        const { nodes, edges } = DotParser.parse(dotContent);
        this.nodes = nodes;
        this.edges = edges;
        this.updateBounds();
    }
    
    updateBounds() {
        if (this.nodes.size === 0) return;
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const node of this.nodes.values()) {
            const bounds = node.getBounds();
            minX = Math.min(minX, bounds.left);
            maxX = Math.max(maxX, bounds.right);
            minY = Math.min(minY, bounds.top);
            maxY = Math.max(maxY, bounds.bottom);
        }
        
        this.bounds = { minX, maxX, minY, maxY };
    }
    
    getNode(id) {
        return this.nodes.get(id);
    }
    
    getNodesInBounds(left, top, right, bottom) {
        const visibleNodes = [];
        for (const node of this.nodes.values()) {
            const bounds = node.getBounds();
            if (!(bounds.right < left || bounds.left > right || bounds.bottom < top || bounds.top > bottom)) {
                visibleNodes.push(node);
            }
        }
        return visibleNodes;
    }
    
    searchNodes(searchTerm) {
        const results = [];
        if (!searchTerm) return results;
        
        const term = searchTerm.toLowerCase();
        for (const node of this.nodes.values()) {
            if (node.label.toLowerCase().includes(term)) {
                results.push(node);
            }
        }
        return results;
    }
    
    updateNodeSelectionState(selectedNodeIds) {
        for (const node of this.nodes.values()) {
            node.selected = selectedNodeIds.has(node.id);
        }
        this.updateEdgeSelectionState(selectedNodeIds);
    }
    
    updateEdgeSelectionState(selectedNodeIds) {
        for (const edge of this.edges) {
            edge.selected = selectedNodeIds.has(edge.fromId) || selectedNodeIds.has(edge.toId);
        }
    }
    
    getConnectedNodes(nodeId) {
        const connected = new Set();
        for (const edge of this.edges) {
            if (edge.fromId === nodeId) {
                connected.add(edge.toId);
            }
            if (edge.toId === nodeId) {
                connected.add(edge.fromId);
            }
        }
        return connected;
    }
    
    getNodeAtPosition(x, y) {
        for (const node of this.nodes.values()) {
            if (node.containsPoint(x, y)) {
                return node;
            }
        }
        return null;
    }
}

class VizState {
    constructor() {
        this.schedule = [];
        this.networkData = '';
        this.currentScheduleIndex = 0;
        this.isPlaying = false;
        this.searchTerm = '';
        this.selectedNodes = new Set();
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
    
    selectNode(nodeId) {
        this.selectedNodes.add(nodeId);
    }
    
    deselectNode(nodeId) {
        this.selectedNodes.delete(nodeId);
    }
    
    toggleNodeSelection(nodeId) {
        if (this.selectedNodes.has(nodeId)) {
            this.deselectNode(nodeId);
            return false;
        } else {
            this.selectNode(nodeId);
            return true;
        }
    }
    
    clearSelection() {
        this.selectedNodes.clear();
    }
    
    isNodeSelected(nodeId) {
        return this.selectedNodes.has(nodeId);
    }
    
    getSelectedNodeCount() {
        return this.selectedNodes.size;
    }
}

class CanvasView {
    constructor(canvas, onMouseMove = null, onClick = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.mouseDownPos = { x: 0, y: 0 };
        this.onMouseMove = onMouseMove;
        this.onClick = onClick;
        
        this.setupEventListeners();
        this.resizeCanvas();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            this.mouseDownPos = mousePos;
            this.lastMousePos = mousePos;
            this.isDragging = true;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            
            if (this.isDragging) {
                const deltaX = mousePos.x - this.lastMousePos.x;
                const deltaY = mousePos.y - this.lastMousePos.y;
                
                const dragThreshold = 5;
                const totalDrag = Math.abs(mousePos.x - this.mouseDownPos.x) + Math.abs(mousePos.y - this.mouseDownPos.y);
                
                if (totalDrag > dragThreshold) {
                    this.camera.x += deltaX;
                    this.camera.y += deltaY;
                }
                
                this.lastMousePos = mousePos;
            } else if (this.onMouseMove) {
                const worldPos = this.screenToWorld(mousePos.x, mousePos.y);
                this.onMouseMove(worldPos.x, worldPos.y);
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isDragging && this.onClick) {
                const rect = this.canvas.getBoundingClientRect();
                const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                
                const dragThreshold = 5;
                const totalDrag = Math.abs(mousePos.x - this.mouseDownPos.x) + Math.abs(mousePos.y - this.mouseDownPos.y);
                
                if (totalDrag <= dragThreshold) {
                    const worldPos = this.screenToWorld(mousePos.x, mousePos.y);
                    this.onClick(worldPos.x, worldPos.y, e.ctrlKey || e.metaKey);
                }
            }
            
            this.isDragging = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const worldPosBefore = this.screenToWorld(mouseX, mouseY);
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom * zoomFactor));
            const worldPosAfter = this.screenToWorld(mouseX, mouseY);
            
            this.camera.x += (worldPosAfter.x - worldPosBefore.x) * this.camera.zoom;
            this.camera.y += (worldPosAfter.y - worldPosBefore.y) * this.camera.zoom;
        });
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 60;
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX * this.camera.zoom) + this.camera.x,
            y: (worldY * this.camera.zoom) + this.camera.y
        };
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.camera.x) / this.camera.zoom,
            y: (screenY - this.camera.y) / this.camera.zoom
        };
    }
    
    getViewportBounds() {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
        
        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y
        };
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    setTransform() {
        this.ctx.setTransform(this.camera.zoom, 0, 0, this.camera.zoom, this.camera.x, this.camera.y);
    }
    
    resetTransform() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

class GraphLayoutEngine {
    constructor(graphModel) {
        this.graphModel = graphModel;
        this.layoutWidth = 2000;
        this.layoutHeight = 3000;
        this.minLayerSpacing = 150;
        this.minNodeSpacing = 60;
    }
    
    layout() {
        if (this.graphModel.nodes.size === 0) return;
        
        const nodes = Array.from(this.graphModel.nodes.values());
        
        // Calculate dynamic layout width based on actual graph structure
        this.calculateDynamicLayoutWidth(nodes);
        
        this.hierarchicalLayout(nodes);
        this.graphModel.updateBounds();
    }
    
    calculateDynamicLayoutWidth(nodes) {
        const levels = this.computeLevels(nodes);
        if (levels.length === 0) return;
        
        let maxLayerWidth = 0;
        
        levels.forEach(levelNodes => {
            if (levelNodes.length === 0) return;
            
            // Calculate total width needed for this layer
            const totalNodeWidth = levelNodes.reduce((sum, node) => sum + node.width, 0);
            const totalSpacing = (levelNodes.length - 1) * this.minNodeSpacing;
            const layerWidth = totalNodeWidth + totalSpacing;
            
            maxLayerWidth = Math.max(maxLayerWidth, layerWidth);
        });
        
        // Set layout width with 20% padding, minimum of 1000px
        this.layoutWidth = Math.max(1000, maxLayerWidth * 1.2);
    }
    
    hierarchicalLayout(nodes) {
        const levels = this.computeLevels(nodes);
        if (levels.length === 0) return;
        
        // Calculate spacing for top-down layout
        const totalLayers = levels.length;
        const layerHeight = Math.max(this.minLayerSpacing, this.layoutHeight / (totalLayers + 1));
        
        // Find the maximum number of nodes in any layer
        const maxNodesInLayer = Math.max(...levels.map(level => level.length));
        
        levels.forEach((levelNodes, layerIndex) => {
            if (levelNodes.length === 0) return;
            
            // Position layer vertically (top-down)
            const layerY = (layerIndex + 1) * layerHeight;
            
            if (levelNodes.length === 1) {
                // Single node - center it
                levelNodes[0].x = this.layoutWidth / 2;
                levelNodes[0].y = layerY;
                return;
            }
            
            // Calculate total width needed for all nodes plus spacing
            const totalNodeWidth = levelNodes.reduce((sum, node) => sum + node.width, 0);
            const totalSpacing = (levelNodes.length - 1) * this.minNodeSpacing;
            const totalNeeded = totalNodeWidth + totalSpacing;
            
            // If nodes don't fit, increase spacing proportionally
            const availableWidth = this.layoutWidth - (this.minNodeSpacing * 2); // Padding left/right
            const scaleFactor = totalNeeded > availableWidth ? availableWidth / totalNeeded : 1;
            const actualNodeSpacing = this.minNodeSpacing * scaleFactor;
            
            // Calculate total layer width with actual spacing
            const totalLayerWidth = totalNodeWidth + (levelNodes.length - 1) * actualNodeSpacing;
            
            // Center the layer horizontally
            const startX = (this.layoutWidth - totalLayerWidth) / 2 + (levelNodes[0].width / 2);
            let currentX = startX;
            
            levelNodes.forEach((node, nodeIndex) => {
                node.x = currentX;
                node.y = layerY;
                
                // Move to next position
                if (nodeIndex < levelNodes.length - 1) {
                    currentX += (node.width / 2) + actualNodeSpacing + (levelNodes[nodeIndex + 1].width / 2);
                }
            });
        });
        
    }
    
    assignLayerNumbers(nodes) {
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        const layerNumbers = new Map();
        const visited = new Set();
        
        // Build predecessor map
        const predecessors = new Map();
        nodes.forEach(node => predecessors.set(node.id, []));
        
        this.graphModel.edges.forEach(edge => {
            if (predecessors.has(edge.toId)) {
                predecessors.get(edge.toId).push(edge.fromId);
            }
        });
        
        // Recursive function to assign layer numbers
        const assignLayer = (nodeId) => {
            if (layerNumbers.has(nodeId)) {
                return layerNumbers.get(nodeId);
            }
            
            if (visited.has(nodeId)) {
                // Cycle detection - assign a default layer
                layerNumbers.set(nodeId, 1);
                return 1;
            }
            
            visited.add(nodeId);
            
            const preds = predecessors.get(nodeId) || [];
            if (preds.length === 0) {
                // Source node - layer 1
                layerNumbers.set(nodeId, 1);
                visited.delete(nodeId);
                return 1;
            }
            
            // Layer = max(predecessor layers) + 1
            let maxPredLayer = 0;
            for (const predId of preds) {
                const predLayer = assignLayer(predId);
                maxPredLayer = Math.max(maxPredLayer, predLayer);
            }
            
            const nodeLayer = maxPredLayer + 1;
            layerNumbers.set(nodeId, nodeLayer);
            visited.delete(nodeId);
            return nodeLayer;
        };
        
        // Assign layers to all nodes
        nodes.forEach(node => assignLayer(node.id));
        
        // Group nodes by layer
        const layers = new Map();
        for (const [nodeId, layer] of layerNumbers.entries()) {
            if (!layers.has(layer)) {
                layers.set(layer, []);
            }
            const node = nodeMap.get(nodeId);
            if (node) {
                layers.get(layer).push(node);
            }
        }
        
        // Convert to array format
        const maxLayer = Math.max(...layerNumbers.values());
        const levels = [];
        for (let i = 1; i <= maxLayer; i++) {
            levels.push(layers.get(i) || []);
        }
        
        return levels;
    }
    
    computeLevels(nodes) {
        return this.assignLayerNumbers(nodes);
    }
}

class GraphRenderer {
    constructor(canvasView) {
        this.canvasView = canvasView;
        this.ctx = canvasView.ctx;
    }
    
    render(graphModel) {
        this.canvasView.clear();
        
        const viewport = this.canvasView.getViewportBounds();
        const visibleNodes = graphModel.getNodesInBounds(
            viewport.left, viewport.top, viewport.right, viewport.bottom
        );
        
        this.canvasView.setTransform();
        
        this.renderEdges(graphModel, visibleNodes);
        this.renderNodes(visibleNodes);
        
        this.canvasView.resetTransform();
    }
    
    renderNodes(nodes) {
        nodes.forEach(node => {
            // Border color priority: selected > scheduled > default
            let borderColor = node.borderColor;
            let lineWidth = 2;
            
            if (node.scheduled) {
                borderColor = '#5c6bc0';
            }
            
            if (node.selected) {
                borderColor = '#42a5f5';
                lineWidth = 3;
            }
            
            // Fill color priority: selected+scheduled > scheduled > highlighted > hovered > default
            let fillColor = node.color;
            if (node.scheduled && node.selected) {
                fillColor = '#b3e5fc';
            } else if (node.scheduled) {
                fillColor = '#90caf9';
            } else if (node.highlighted) {
                fillColor = '#FFD700';
            } else if (node.hovered) {
                fillColor = '#eeeeee';
            }
            
            this.ctx.fillStyle = fillColor;
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = lineWidth;
            
            const bounds = node.getBounds();
            this.ctx.fillRect(bounds.left, bounds.top, node.width, node.height);
            this.ctx.strokeRect(bounds.left, bounds.top, node.width, node.height);
            
            this.ctx.fillStyle = node.textColor;
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.label, node.x, node.y);
        });
    }
    
    renderEdges(graphModel, visibleNodes) {
        graphModel.edges.forEach(edge => {
            const fromNode = graphModel.getNode(edge.fromId);
            const toNode = graphModel.getNode(edge.toId);
            
            if (!fromNode || !toNode) return;
            
            let strokeColor = edge.color;
            let lineWidth = edge.width;
            
            const isScheduledEdge = fromNode.scheduled || toNode.scheduled;
            
            if (edge.selected) {
                strokeColor = '#42a5f5';
                lineWidth = 3;
            } else if (edge.highlighted) {
                strokeColor = '#FF6B35';
                lineWidth = edge.width;
            } else if (isScheduledEdge) {
                strokeColor = '#7986cb';
                lineWidth = 3;
            }
            
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = lineWidth;
            
            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y + fromNode.height / 2);
            this.ctx.lineTo(toNode.x, toNode.y - toNode.height / 2);
            this.ctx.stroke();
            
            this.drawArrowHead(
                fromNode.x, fromNode.y + fromNode.height / 2,
                toNode.x, toNode.y - toNode.height / 2,
                strokeColor
            );
        });
    }
    
    drawArrowHead(fromX, fromY, toX, toY, strokeColor = null) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 10;
        
        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - arrowLength * Math.cos(angle - Math.PI / 6),
            toY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - arrowLength * Math.cos(angle + Math.PI / 6),
            toY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
    }
}

class App {
    constructor() {
        this.state = new VizState();
        this.canvas = document.getElementById('canvas');
        this.view = new CanvasView(
            this.canvas, 
            (x, y) => this.handleMouseMove(x, y),
            (x, y, ctrlKey) => this.handleClick(x, y, ctrlKey)
        );
        this.graphModel = new GraphModel();
        this.layoutEngine = new GraphLayoutEngine(this.graphModel);
        this.renderer = new GraphRenderer(this.view);
        this.animationId = null;
        
        this.initializeControls();
        this.loadData();
        this.startRenderLoop();
        this.setupKeyboardHandlers();
    }
    
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }
    
    handleClick(worldX, worldY, ctrlKey) {
        const clickedNode = this.graphModel.getNodeAtPosition(worldX, worldY);
        
        if (clickedNode) {
            if (ctrlKey) {
                this.state.toggleNodeSelection(clickedNode.id);
            } else {
                this.state.selectNode(clickedNode.id);
            }
        } else {
            this.state.clearSelection();
        }
        
        this.updateSelection();
    }
    
    clearSelection() {
        this.state.clearSelection();
        this.updateSelection();
    }
    
    updateSelection() {
        this.graphModel.updateNodeSelectionState(this.state.selectedNodes);
        this.updateSelectionInfo();
    }
    
    updateSelectionInfo() {
        const selectionInfo = document.getElementById('selection-info');
        const count = this.state.getSelectedNodeCount();
        
        if (count === 0) {
            selectionInfo.textContent = 'No nodes selected';
        } else if (count === 1) {
            const selectedId = Array.from(this.state.selectedNodes)[0];
            const selectedNode = this.graphModel.getNode(selectedId);
            selectionInfo.textContent = `Selected: ${selectedNode ? selectedNode.label : selectedId}`;
        } else {
            selectionInfo.textContent = `${count} nodes selected`;
        }
    }
    
    initializeControls() {
        const scheduleSlider = document.getElementById('schedule-slider');
        const speedSlider = document.getElementById('speed-slider');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const searchInput = document.getElementById('search-input');
        
        scheduleSlider.addEventListener('input', (e) => {
            this.state.updateScheduleIndex(parseInt(e.target.value));
            this.updateScheduleVisualization();
        });
        
        playPauseBtn.addEventListener('click', () => {
            this.state.isPlaying = !this.state.isPlaying;
            playPauseBtn.textContent = this.state.isPlaying ? 'Pause' : 'Play';
            if (this.state.isPlaying) {
                this.startAnimation();
            } else {
                this.stopAnimation();
            }
        });
        
        searchInput.addEventListener('input', (e) => {
            this.state.searchTerm = e.target.value;
            this.updateSearchHighlights();
        });
    }
    
    handleMouseMove(worldX, worldY) {
        for (const node of this.graphModel.nodes.values()) {
            node.hovered = node.containsPoint(worldX, worldY);
        }
    }
    
    updateSearchHighlights() {
        for (const node of this.graphModel.nodes.values()) {
            node.highlighted = false;
        }
        
        if (this.state.searchTerm) {
            // Clear current selection and select matching nodes
            this.state.clearSelection();
            
            const results = this.graphModel.searchNodes(this.state.searchTerm);
            results.forEach(node => {
                node.highlighted = true;
                this.state.selectNode(node.id);
            });
            
            // Update visual selection state
            this.updateSelection();
        }
    }
    
    updateScheduleVisualization() {
        for (const node of this.graphModel.nodes.values()) {
            node.scheduled = false;
        }
        
        for (let i = 0; i <= this.state.currentScheduleIndex; i++) {
            if (i < this.state.schedule.length) {
                const scheduleItem = this.state.schedule[i];
                const node = this.graphModel.getNode(scheduleItem.op_magic.toString());
                if (node) {
                    node.scheduled = true;
                }
            }
        }
    }
    
    startAnimation() {
        if (this.animationId) return;
        
        const animate = () => {
            if (this.state.isPlaying) {
                if (this.state.currentScheduleIndex < this.state.schedule.length - 1) {
                    this.state.updateScheduleIndex(this.state.currentScheduleIndex + 1);
                    this.updateScheduleVisualization();
                    
                    const scheduleSlider = document.getElementById('schedule-slider');
                    scheduleSlider.value = this.state.currentScheduleIndex;
                    
                    this.animationId = setTimeout(animate, 1000);
                } else {
                    this.state.isPlaying = false;
                    document.getElementById('play-pause-btn').textContent = 'Play';
                    this.animationId = null;
                }
            }
        };
        
        animate();
    }
    
    stopAnimation() {
        if (this.animationId) {
            clearTimeout(this.animationId);
            this.animationId = null;
        }
    }
    
    startRenderLoop() {
        const render = () => {
            this.renderer.render(this.graphModel);
            requestAnimationFrame(render);
        };
        render();
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
            
            this.graphModel.setGraphData(networkData);
            this.layoutEngine.layout();
            
            const scheduleSlider = document.getElementById('schedule-slider');
            scheduleSlider.max = scheduleData.schedule.length - 1;
            
            this.centerGraph();
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    centerGraph() {
        if (this.graphModel.nodes.size === 0) {
            // Fallback: center camera at origin
            this.view.camera.x = this.canvas.width / 2;
            this.view.camera.y = this.canvas.height / 2;
            this.view.camera.zoom = 0.5;
            console.log('No nodes found, centering at origin');
            return;
        }
        
        // Get first node to ensure we start on something visible
        const firstNode = Array.from(this.graphModel.nodes.values())[0];
        
        // Simple, reliable zoom and positioning
        const zoom = 0.3; // 30% zoom - good balance for large graphs
        this.view.camera.zoom = zoom;
        this.view.camera.x = this.canvas.width / 2 - firstNode.x * zoom;
        this.view.camera.y = this.canvas.height / 2 - firstNode.y * zoom;
        
        console.log(`Centered on first node: ${firstNode.label} at position (${firstNode.x}, ${firstNode.y}) with zoom ${zoom}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});