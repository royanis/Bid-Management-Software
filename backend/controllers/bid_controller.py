import os
import json
from datetime import datetime
import uuid
from utils.logo_fetcher import fetch_logo

# Define the base directory for storing bid data
DATA_DIR = os.path.join(os.path.dirname(__file__), '../data')

# Utility: Ensure the data directory exists
def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

# Utility: Save JSON to file
def save_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

# Utility: Read JSON from file
def load_json(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

# Create a new bid
def create_bid(data):
    ensure_data_dir()

    client_name = data.get('clientName')
    bid_timeline = data.get('bidTimeline')
    deliverables = data.get('deliverables')

    # Validate required fields
    if not client_name or not bid_timeline or not deliverables:
        return {'success': False, 'message': 'Missing required fields', 'status': 400}

    # Generate a unique bid name
    bid_name = f"{client_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
    bid_path = os.path.join(DATA_DIR, bid_name)

    try:
        # Create bid directory
        os.makedirs(bid_path, exist_ok=True)

        # Save bid metadata
        metadata = {
            'clientName': client_name,
            'bidTimeline': bid_timeline,
            'deliverables': deliverables,
        }
        save_json(os.path.join(bid_path, 'metadata.json'), metadata)

        # Attempt to fetch and save the client logo
        logo_path = os.path.join(bid_path, 'client_logo.png')
        try:
            fetch_logo(client_name, logo_path)
        except Exception as e:
            # If logo fetching fails, log the error and continue
            print(f"Warning: Failed to fetch logo for {client_name}. Error: {str(e)}")

        return {'success': True, 'bidName': bid_name, 'message': 'Bid created successfully'}
    except Exception as e:
        return {'success': False, 'message': f"Error creating bid: {str(e)}", 'status': 500}

# List all available bids
def list_bids():
    ensure_data_dir()

    try:
        # Validate bids directories
        bids = []
        for bid_dir in os.listdir(DATA_DIR):
            bid_path = os.path.join(DATA_DIR, bid_dir)
            metadata_path = os.path.join(bid_path, 'metadata.json')
            if os.path.isdir(bid_path) and os.path.exists(metadata_path):
                # Load metadata for each valid bid
                try:
                    metadata = load_json(metadata_path)
                    bids.append({
                        'bidName': bid_dir,
                        'clientName': metadata.get('clientName', 'Unknown'),
                        'lastModified': os.path.getmtime(metadata_path),
                    })
                except Exception as e:
                    print(f"Warning: Skipping invalid bid directory {bid_dir}. Error: {str(e)}")
        return {'success': True, 'bids': bids}
    except Exception as e:
        return {'success': False, 'message': f"Error listing bids: {str(e)}", 'status': 500}

# Retrieve metadata for a specific bid
def get_bid(bid_name):
    ensure_data_dir()
    bid_path = os.path.join(DATA_DIR, bid_name, 'metadata.json')

    try:
        if os.path.exists(bid_path):
            metadata = load_json(bid_path)
            return {'success': True, 'metadata': metadata}
        return {'success': False, 'message': 'Bid not found', 'status': 404}
    except Exception as e:
        return {'success': False, 'message': f"Error retrieving bid: {str(e)}", 'status': 500}