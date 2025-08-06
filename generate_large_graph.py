#!/usr/bin/env python3

import json
import os

def generate_large_graph(layers=10, nodes_per_layer=100, connections_per_node=4):
    """
    Generate a sparse layer graph for performance testing.
    
    Args:
        layers: Number of layers (default 10)
        nodes_per_layer: Nodes per layer (default 100) 
        connections_per_node: Connections each node makes to next layer (default 4)
    
    Returns:
        tuple: (dot_content, schedule_data)
    """
    
    # Layer types
    layer_types = ['INPUT', 'DENSE', 'DENSE', 'DENSE', 'OUTPUT']
    
    # Ensure we have enough layer types
    while len(layer_types) < layers:
        layer_types.append('DENSE')
    
    total_nodes = layers * nodes_per_layer
    print(f"Generating graph with {total_nodes} nodes ({layers} layers × {nodes_per_layer} nodes)")
    
    # Generate DOT content
    print("Generating DOT content...")
    dot_lines = ["digraph program {"]
    
    # Generate nodes
    node_id = 10000  # Starting ID
    for layer in range(layers):
        layer_type = layer_types[layer]
        for pos in range(nodes_per_layer):
            node_name = f"{layer_type}_{node_id}"
            dot_lines.append(f'    {node_name} [id="{node_id}"]')
            node_id += 1
    
    print("Generating edges...")
    # Generate sparse edges between layers
    import random
    random.seed(42)  # For reproducible results
    
    node_id = 10000
    total_edges = 0
    
    for layer in range(layers - 1):
        # Connect each node in current layer to random nodes in next layer
        current_layer_start = node_id
        next_layer_start = node_id + nodes_per_layer
        
        current_layer_type = layer_types[layer]
        next_layer_type = layer_types[layer + 1]
        
        for current_pos in range(nodes_per_layer):
            current_node_id = current_layer_start + current_pos
            current_node_name = f"{current_layer_type}_{current_node_id}"
            
            # Randomly select nodes in next layer to connect to
            next_nodes = random.sample(range(nodes_per_layer), 
                                     min(connections_per_node, nodes_per_layer))
            
            for next_pos in next_nodes:
                next_node_id = next_layer_start + next_pos
                next_node_name = f"{next_layer_type}_{next_node_id}"
                
                dot_lines.append(f"    {current_node_name} -> {next_node_name};")
                total_edges += 1
        
        node_id += nodes_per_layer
    
    dot_lines.append("}")
    dot_content = "\n".join(dot_lines)
    
    print("Generating schedule...")
    # Generate linear schedule
    schedule_items = []
    node_id = 10000
    
    for layer in range(layers):
        layer_type = layer_types[layer]
        for pos in range(nodes_per_layer):
            schedule_items.append({
                "op_code": layer_type,
                "op_magic": node_id
            })
            node_id += 1
    
    schedule_data = {
        "schedule": schedule_items
    }
    
    print(f"Generated {total_nodes} nodes and {total_edges} edges")
    
    return dot_content, schedule_data

def backup_existing_files():
    """Backup existing small graph files."""
    if os.path.exists('network.dot'):
        os.rename('network.dot', 'network_small.dot')
        print("Backed up network.dot to network_small.dot")
    
    if os.path.exists('schedule.json'):
        os.rename('schedule.json', 'schedule_small.json')
        print("Backed up schedule.json to schedule_small.json")

def main():
    print("Large Graph Generator for Schedule Visualizer")
    print("=" * 50)
    
    # Backup existing files
    backup_existing_files()
    
    # Generate large graph
    dot_content, schedule_data = generate_large_graph()
    
    # Write DOT file
    print("Writing network.dot...")
    with open('network.dot', 'w') as f:
        f.write(dot_content)
    
    # Write schedule file
    print("Writing schedule.json...")
    with open('schedule.json', 'w') as f:
        json.dump(schedule_data, f, indent=2)
    
    print("\nGeneration complete!")
    print("Files created:")
    print("  - network.dot (large graph)")
    print("  - schedule.json (large schedule)")
    print("  - network_small.dot (backup)")
    print("  - schedule_small.json (backup)")
    print("\nYou can now test the visualization with the large graph!")

if __name__ == "__main__":
    main()