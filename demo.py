import plotly.graph_objects as go
import numpy as np
import json
import sys
import os
from scipy.spatial import ConvexHull

def load_joystick_data(json_file_path):
    """
    Load joystick attitude angle data from JSON file
    """
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    # Extract attitude angle data
    rolls = []
    pitches = []
    
    for training_point in data['training_data']:
        input_state = training_point['inputState']
        rolls.append(input_state['roll'])
        pitches.append(input_state['pitch'])
    
    rolls = np.array(rolls)
    pitches = np.array(pitches)
    
    return rolls, pitches

def convert_angles_to_coordinates(rolls, pitches, length=1.0):
    """
    Convert roll and pitch angles to 3D coordinates
    Assumes the initial joystick direction is along the positive Z-axis
    """
    # Calculate tilt angles and azimuth angles
    tilt_angles = np.sqrt(rolls**2 + pitches**2)
    azimuth = np.arctan2(pitches, rolls)
    
    # Convert to Cartesian coordinates
    x = length * np.sin(tilt_angles) * np.cos(azimuth)
    y = length * np.sin(tilt_angles) * np.sin(azimuth)
    z = length * np.cos(tilt_angles)
    
    return x, y, z

def find_true_boundary_points(x, y, z, n_sectors=180):
    """
    Find the true conical boundary points to ensure all points are included
    """
    # Calculate azimuth and distance for each point
    azimuth = np.arctan2(y, x)  # Range: -π to π
    distances = np.sqrt(x**2 + y**2 + z**2)
    
    # Convert azimuth to 0 to 2π range
    azimuth_positive = azimuth.copy()
    azimuth_positive[azimuth < 0] += 2 * np.pi
    
    # Divide azimuth into n_sectors sectors
    sector_angles = np.linspace(0, 2*np.pi, n_sectors, endpoint=False)
    sector_width = 2*np.pi / n_sectors
    
    boundary_points = []
    
    for i, sector_center in enumerate(sector_angles):
        # Calculate which sector each point belongs to
        sector_start = sector_center - sector_width/2
        sector_end = sector_center + sector_width/2
        
        # Handle boundary cases (when sector crosses 0/2π)
        if sector_start < 0:
            sector_start += 2*np.pi
            sector_mask = (azimuth_positive >= sector_start) | (azimuth_positive < sector_end)
        elif sector_end > 2*np.pi:
            sector_end -= 2*np.pi
            sector_mask = (azimuth_positive >= sector_start) | (azimuth_positive < sector_end)
        else:
            sector_mask = (azimuth_positive >= sector_start) & (azimuth_positive < sector_end)
        
        # If there are points in this sector
        if np.any(sector_mask):
            # Find the point with the maximum distance in this sector
            sector_distances = distances[sector_mask]
            sector_indices = np.where(sector_mask)[0]
            
            max_distance_idx = sector_indices[np.argmax(sector_distances)]
            
            boundary_points.append([x[max_distance_idx], y[max_distance_idx], z[max_distance_idx]])
    
    boundary_points = np.array(boundary_points)
    
    # Sort boundary points by azimuth
    if len(boundary_points) > 0:
        boundary_azimuth = np.arctan2(boundary_points[:, 1], boundary_points[:, 0])
        boundary_azimuth[boundary_azimuth < 0] += 2*np.pi
        sort_idx = np.argsort(boundary_azimuth)
        boundary_points = boundary_points[sort_idx]
    
    return boundary_points

def extend_boundary_to_boundary_highest_plane(boundary_points):
    """
    Extend boundary points to the highest plane among boundary points
    """
    if len(boundary_points) == 0:
        return boundary_points
    
    # Find the maximum Z value among boundary points
    max_z_boundary = np.max(boundary_points[:, 2])
    
    print(f"Maximum height of boundary points: {max_z_boundary:.4f}")
    print(f"Extending boundary points to the highest plane of boundary points: {max_z_boundary:.4f}")
    
    # Create a new array of boundary points extended to the highest plane
    extended_points = []
    
    for point in boundary_points:
        x0, y0, z0 = point
        
        # If this point is already at the highest plane, add it directly
        if abs(z0 - max_z_boundary) < 1e-10:
            extended_points.append([x0, y0, z0])
            continue
            
        # Calculate vector from origin to boundary point
        # Use similar triangles to extend point to the highest boundary plane
        if z0 > 0:
            scale_factor = max_z_boundary / z0
            x_ext = x0 * scale_factor
            y_ext = y0 * scale_factor
            z_ext = max_z_boundary
            extended_points.append([x_ext, y_ext, z_ext])
        else:
            # If z0 is 0 or negative, keep the original point
            extended_points.append([x0, y0, z0])
    
    extended_points = np.array(extended_points)
    
    return extended_points, max_z_boundary

def create_maximum_reachable_space(x, y, z):
    """
    Create the true conical shape of maximum reachable space
    """
    print("Calculating maximum reachable space using convex hull algorithm...")
    
    # Combine all points including the origin
    all_points = np.vstack([[0, 0, 0], np.column_stack((x, y, z))])
    
    # Calculate convex hull
    try:
        hull = ConvexHull(all_points)
        
        # Get convex hull vertices (excluding origin)
        hull_vertices = all_points[hull.vertices]
        
        # Find convex hull faces connected to the origin (cone faces)
        cone_faces = []
        for simplex in hull.simplices:
            # If face contains origin (index 0), it's a cone face
            if 0 in simplex:
                cone_faces.append(simplex)
        
        # Extract boundary points from cone faces
        boundary_indices = set()
        for face in cone_faces:
            # Get vertices that are not the origin
            for idx in face:
                if idx != 0:
                    boundary_indices.add(idx)
        
        boundary_indices = list(boundary_indices)
        boundary_points = all_points[boundary_indices]
        
        # Sort boundary points by azimuth
        boundary_azimuth = np.arctan2(boundary_points[:, 1], boundary_points[:, 0])
        boundary_azimuth[boundary_azimuth < 0] += 2*np.pi
        sort_idx = np.argsort(boundary_azimuth)
        boundary_points = boundary_points[sort_idx]
        
        method = "Convex Hull Algorithm"
        
    except Exception as e:
        print(f"Convex hull calculation failed: {e}")
        print("Using high-precision boundary point method...")
        
        # Alternative method: use high-precision boundary point method
        boundary_points = find_true_boundary_points(x, y, z, n_sectors=360)
        method = "High-Precision Boundary Point Method"
    
    if len(boundary_points) < 3:
        print("Error: Insufficient boundary points to form a cone")
        return None
    
    # Extend boundary points to the highest plane among boundary points
    extended_boundary_points, boundary_max_z = extend_boundary_to_boundary_highest_plane(boundary_points)
    
    # Close the boundary
    original_boundary_closed = np.vstack([boundary_points, boundary_points[0]])
    extended_boundary_closed = np.vstack([extended_boundary_points, extended_boundary_points[0]])
    
    # Create vertex array: origin + all extended boundary points
    vertices = [[0, 0, 0]]  # Origin point
    for i in range(len(extended_boundary_points)):
        vertices.append([extended_boundary_points[i, 0], 
                         extended_boundary_points[i, 1], 
                         extended_boundary_points[i, 2]])
    
    vertices = np.array(vertices)
    
    # Create triangular faces
    triangles = []
    n_boundary = len(extended_boundary_points)
    
    for i in range(n_boundary):
        next_i = (i + 1) % n_boundary
        triangles.append([0, i+1, next_i+1])
    
    triangles = np.array(triangles)
    
    # Get heights (Z coordinates) of all vertices
    heights = vertices[:, 2]
    
    # Calculate height range
    height_min = np.min(heights)
    height_max = np.max(heights)
    height_range = height_max - height_min
    
    # Normalize heights to 0-1 range
    if height_range > 0:
        normalized_heights = (heights - height_min) / height_range
    else:
        normalized_heights = np.ones_like(heights) * 0.5
    
    # Custom color scale: purple-blue-green-yellow-red
    custom_colorscale = [
        [0.0, 'rgb(128, 0, 128)'],    # Purple
        [0.25, 'rgb(0, 0, 255)'],     # Blue
        [0.5, 'rgb(0, 128, 0)'],      # Green
        [0.75, 'rgb(255, 255, 0)'],   # Yellow
        [1.0, 'rgb(255, 0, 0)']       # Red
    ]
    
    # Create figure
    fig = go.Figure()
    
    # 1. Add all data points
    fig.add_trace(go.Scatter3d(
        x=x,
        y=y,
        z=z,
        mode='markers',
        marker=dict(
            size=2,
            color='rgba(70, 130, 180, 0.3)',
            symbol='circle',
            line=dict(width=0)
        ),
        name=f'All Data Points ({len(x):,})',
        hovertemplate='X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>'
    ))
    
    # 2. Add extended conical surface (maximum reachable space)
    fig.add_trace(go.Mesh3d(
        x=vertices[:, 0],
        y=vertices[:, 1],
        z=vertices[:, 2],
        i=triangles[:, 0],
        j=triangles[:, 1],
        k=triangles[:, 2],
        colorscale=custom_colorscale,  # Use custom color scale
        intensity=normalized_heights,
        intensitymode='vertex',
        colorbar=dict(
            title=dict(
                text='Height',
                side='right',
                font=dict(size=12, color='black')
            ),
            thickness=20,
            len=0.75,
            tickfont=dict(size=10, color='black'),
            tickformat='.2f',
            bgcolor='rgba(255, 255, 255, 0.8)',
            tickvals=[0, 0.25, 0.5, 0.75, 1.0],
            ticktext=['Lowest', 'Lower', 'Medium', 'Higher', 'Highest']
        ),
        opacity=0.7,
        name=f'Extended Maximum Reachable Space ({method})',
        hovertemplate='Maximum Reachable Space<br>X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>',
        lighting=dict(
            ambient=0.7,
            diffuse=0.9,
            specular=0.5,
            roughness=0.5
        )
    ))
    
    # 3. Add extended boundary lines (solid line)
    fig.add_trace(go.Scatter3d(
        x=extended_boundary_closed[:, 0],
        y=extended_boundary_closed[:, 1],
        z=extended_boundary_closed[:, 2],
        mode='lines',
        line=dict(
            color='blue',
            width=2
        ),
        name='Maximum Reachable Space Boundary',
        hoverinfo='skip'
    ))
    
    # 4. Add lines from origin to extended boundary points
    n_lines = min(30, len(extended_boundary_points))
    indices = np.linspace(0, len(extended_boundary_points)-1, n_lines, dtype=int)
    
    for idx in indices:
        fig.add_trace(go.Scatter3d(
            x=[0, extended_boundary_points[idx, 0]],
            y=[0, extended_boundary_points[idx, 1]],
            z=[0, extended_boundary_points[idx, 2]],
            mode='lines',
            line=dict(
                color='rgba(50, 150, 50, 0.4)',
                width=1
            ),
            showlegend=False,
            hoverinfo='skip'
        ))
    
    # Update layout
    fig.update_layout(
        title=dict(
            text=f'Maximum Reachable Space Visualization<br>Data Points: {len(x):,} | Boundary Max Height: {boundary_max_z:.3f}',
            font=dict(size=16, color='black'),
            x=0.5,
            y=0.95
        ),
        scene=dict(
            xaxis=dict(
                title='X/mm',
                titlefont=dict(size=12, color='black'),
                range=[-1.5, 1.5],
                backgroundcolor="white",
                gridcolor="rgb(220, 220, 220)",
                showbackground=True,
                color='black'
            ),
            yaxis=dict(
                title='Y/mm',
                titlefont=dict(size=12, color='black'),
                range=[-1.5, 1.5],
                backgroundcolor="white",
                gridcolor="rgb(220, 220, 220)",
                showbackground=True,
                color='black'
            ),
            zaxis=dict(
                title='Z/mm',
                titlefont=dict(size=12, color='black'),
                range=[-0.2, 1.2],
                backgroundcolor="white",
                gridcolor="rgb(220, 220, 220)",
                showbackground=True,
                color='black'
            ),
            camera=dict(
                eye=dict(x=1.8, y=1.8, z=0.8)
            ),
            aspectmode='cube'
        ),
        width=1000,
        height=800,
        showlegend=True,
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="left",
            x=0.01,
            bgcolor='rgba(255, 255, 255, 0.8)',
            font=dict(size=11, color='black')
        ),
        paper_bgcolor='white',
        plot_bgcolor='white'
    )
    
    return fig

def main():
    # Check if a file path is provided as command line argument
    if len(sys.argv) > 1:
        json_file_path = sys.argv[1]
    else:
        # Default file path if no argument provided
        json_file_path = "training_data.json"
    
    # Generate output filename based on input filename
    base_name = os.path.splitext(os.path.basename(json_file_path))[0]
    output_filename = f"maximum_reachable_space_{base_name}.html"
    
    print("Maximum Reachable Space Cone Fitting Analysis")
    print("=" * 50)
    print(f"Input file: {json_file_path}")
    print(f"Output file: {output_filename}")
    
    try:
        # 1. Load data
        print("1. Loading data...")
        rolls, pitches = load_joystick_data(json_file_path)
        
        # 2. Convert to 3D coordinates
        print("2. Converting to 3D coordinates...")
        x, y, z = convert_angles_to_coordinates(rolls, pitches)
        
        print(f"  Number of data points: {len(x):,}")
        print(f"  Coordinate range:")
        print(f"    X: [{x.min():.3f}, {x.max():.3f}]")
        print(f"    Y: [{y.min():.3f}, {y.max():.3f}]")
        print(f"    Z: [{z.min():.3f}, {z.max():.3f}]")
        print(f"    Max Z: {z.max():.3f}")
        
        # 3. Create maximum reachable space visualization
        print("\n3. Creating maximum reachable space visualization...")
        fig = create_maximum_reachable_space(x, y, z)
        
        if fig is None:
            print("Error: Failed to create visualization")
            return
        
        # 4. Save and display
        fig.write_html(output_filename)
        
        print("\n4. Visualization saved:")
        print(f"   - {output_filename} (Extended maximum reachable space)")
        
        # Display the figure
        fig.show()
        
        print("\nAnalysis completed!")
        
    except FileNotFoundError:
        print(f"Error: File not found {json_file_path}")
        print("Please provide a valid JSON file path as command line argument")
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()