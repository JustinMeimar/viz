#!/usr/bin/env python3

import json
import os
import random

def generate_hourglass_graph():
    """Generate a classic hourglass-shaped graph with varying layer sizes"""
    
    # Hourglass layer structure: wide -> narrow -> wide
    layer_sizes = [500, 250, 100, 50, 20, 50, 100, 250, 500]
    layer_types = ['INPUT', 'DENSE', 'DENSE', 'DENSE', 'BOTTLENECK', 'DENSE', 'DENSE', 'DENSE', 'OUTPUT']
    
    dot_lines = ["digraph hourglass_test {"]
    
    # Generate nodes for each layer
    node_id = 10000
    layer_nodes = []  # Track nodes by layer for connection generation
    
    for layer_idx, layer_size in enumerate(layer_sizes):
        layer_type = layer_types[layer_idx]
        current_layer_nodes = []
        
        for pos in range(layer_size):
            node_name = f"{layer_type}_{node_id}"
            dot_lines.append(f'    {node_name} [id="{node_id}"]')
            current_layer_nodes.append((node_id, node_name))
            node_id += 1
        
        layer_nodes.append(current_layer_nodes)
    
    # Generate edges between adjacent layers
    random.seed(42)  # For reproducible results
    
    for layer_idx in range(len(layer_sizes) - 1):
        current_layer = layer_nodes[layer_idx]
        next_layer = layer_nodes[layer_idx + 1]
        
        current_size = len(current_layer)
        next_size = len(next_layer)
        
        # Dense connections for hourglass effect
        if current_size >= next_size:
            # Contracting: many-to-few connections
            connections_per_node = max(1, min(3, next_size))
            for current_node_id, current_node_name in current_layer:
                # Connect to random subset of next layer
                target_indices = random.sample(range(next_size), connections_per_node)
                for target_idx in target_indices:
                    target_node_id, target_node_name = next_layer[target_idx]
                    dot_lines.append(f"    {current_node_name} -> {target_node_name};")
        else:
            # Expanding: few-to-many connections  
            connections_per_target = max(1, min(3, current_size))
            for next_node_id, next_node_name in next_layer:
                # Each next node connects from random subset of current layer
                source_indices = random.sample(range(current_size), connections_per_target)
                for source_idx in source_indices:
                    source_node_id, source_node_name = current_layer[source_idx]
                    dot_lines.append(f"    {source_node_name} -> {next_node_name};")
    
    dot_lines.append("}")
    dot_content = "\n".join(dot_lines)
    
    # Generate schedule data
    schedule_items = []
    
    # Add all nodes to schedule in layer order
    for layer_nodes_list in layer_nodes:
        for node_id, node_name in layer_nodes_list:
            layer_type = node_name.split('_')[0]
            schedule_items.append({
                "op_code": layer_type,
                "op_magic": node_id
            })
    
    schedule_data = {
        "schedule": schedule_items
    }
    
    return dot_content, schedule_data

def backup_existing_files():
    """Backup current files before overwriting"""
    if os.path.exists('network.dot'):
        os.rename('network.dot', 'network_backup.dot')
        print("Backed up existing network.dot to network_backup.dot")
    
    if os.path.exists('schedule.json'):
        os.rename('schedule.json', 'schedule_backup.json')
        print("Backed up existing schedule.json to schedule_backup.json")

def main():
    print("Generating hourglass test graph...")
    
    backup_existing_files()
    dot_content, schedule_data = generate_hourglass_graph()
    
    with open('network.dot', 'w') as f:
        f.write(dot_content)
    
    with open('schedule.json', 'w') as f:
        json.dump(schedule_data, f, indent=2)
    
    print("Generated hourglass test files:")
    print("- network.dot (hourglass graph structure)")
    print("- schedule.json (corresponding schedule)")
    print("\nLayer structure: 50 → 25 → 10 → 5 → 2 → 5 → 10 → 25 → 50 nodes")
    print("Perfect for testing wide-first-layer centering and zoom-to-fit!")

if __name__ == "__main__":
    main()
