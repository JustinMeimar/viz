#!/usr/bin/env python3

import json
import os

def generate_large_graph(layers=10, nodes_per_layer=100, connections_per_node=4):
    
    layer_types = ['INPUT', 'DENSE', 'DENSE', 'DENSE', 'OUTPUT']
    
    while len(layer_types) < layers:
        layer_types.append('DENSE')
    
    total_nodes = layers * nodes_per_layer
    dot_lines = ["digraph program {"]
    
    node_id = 10000  # Starting ID
    for layer in range(layers):
        layer_type = layer_types[layer]
        for pos in range(nodes_per_layer):
            node_name = f"{layer_type}_{node_id}"
            dot_lines.append(f'    {node_name} [id="{node_id}"]')
            node_id += 1
    
    import random
    random.seed(42)
    
    node_id = 10000
    total_edges = 0
    
    for layer in range(layers - 1):
        current_layer_start = node_id
        next_layer_start = node_id + nodes_per_layer
        
        current_layer_type = layer_types[layer]
        next_layer_type = layer_types[layer + 1]
        
        for current_pos in range(nodes_per_layer):
            current_node_id = current_layer_start + current_pos
            current_node_name = f"{current_layer_type}_{current_node_id}"
            
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
    
    
    return dot_content, schedule_data

def backup_existing_files():
    if os.path.exists('network.dot'):
        os.rename('network.dot', 'network_small.dot')
    
    if os.path.exists('schedule.json'):
        os.rename('schedule.json', 'schedule_small.json')

def main():
    backup_existing_files()
    dot_content, schedule_data = generate_large_graph()
    
    with open('network.dot', 'w') as f:
        f.write(dot_content)
    
    with open('schedule.json', 'w') as f:
        json.dump(schedule_data, f, indent=2)
    

if __name__ == "__main__":
    main()