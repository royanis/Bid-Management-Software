from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime

app = Flask(__name__)

# Enable CORS for frontend origin
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)

# Ensure the `bids` directory exists
os.makedirs('bids', exist_ok=True)

# Utility function to get the file path for a bid
def get_bid_file_path(bid_id="current_bid"):
    return os.path.join('bids', f"{bid_id}.json")

# Middleware to log all incoming requests
@app.before_request
def log_request_info():
    print(f"[Request] {request.method} {request.url}")
    print(f"[Request Headers] {request.headers}")
    if request.method != 'OPTIONS':  # Exclude body for preflight requests
        print(f"[Request Body] {request.get_data()}")

# Middleware to add consistent CORS headers
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# Endpoint: Create a new bid
@app.route('/create-bid', methods=['OPTIONS', 'POST'])
def create_bid():
    if request.method == 'OPTIONS':  # Handle preflight request
        return jsonify({}), 200

    try:
        data = request.json
        print("[DEBUG] Incoming data:", data)  # Log the incoming payload

        required_fields = ['clientName', 'opportunityName', 'timeline']
        timeline_fields = ['rfpIssueDate', 'qaSubmissionDate', 'proposalSubmissionDate']

        # Validate top-level required fields
        for field in required_fields:
            if field not in data or not data[field]:
                print(f"[ERROR] Missing or empty field: {field}")
                return jsonify({"success": False, "message": f"Field {field} is missing or empty."}), 400

        # Validate nested timeline fields
        for t_field in timeline_fields:
            if t_field not in data['timeline'] or not data['timeline'][t_field]:
                print(f"[ERROR] Missing or empty timeline field: {t_field}")
                return jsonify({"success": False, "message": f"Timeline field {t_field} is missing or empty."}), 400

        # Validate deliverables
        if not data.get('deliverables') or not any(data['deliverables']):
            print("[ERROR] No deliverables selected")
            return jsonify({"success": False, "message": "At least one deliverable must be selected."}), 400

        # Generate bid ID and save the data
        bid_id = f"{data['clientName']}_{data['opportunityName']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        file_path = get_bid_file_path(bid_id)
        with open(file_path, 'w') as file:
            json.dump(data, file, indent=4)

        print("[DEBUG] Bid created successfully:", bid_id)
        return jsonify({"success": True, "message": f"Bid created successfully: {bid_id}", "bidId": bid_id}), 201
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error creating bid: {str(e)}"}), 500

# Endpoint: Save bid data
@app.route('/save-bid-data', methods=['OPTIONS', 'POST'])
def save_bid_data():
    if request.method == 'OPTIONS':  # Preflight request
        return jsonify({}), 200

    try:
        data = request.json
        bid_id = data.get('bidId', 'current_bid')
        file_path = get_bid_file_path(bid_id)

        with open(file_path, 'w') as file:
            json.dump(data, file, indent=4)

        return jsonify({"message": "Bid data saved successfully."}), 200
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"success": False, "message": f"Error saving bid data: {str(e)}"}), 500

# Endpoint: Delete bid data
@app.route('/delete-bid-data', methods=['OPTIONS', 'DELETE'])
def delete_bid_data():
    if request.method == 'OPTIONS':  # Preflight request
        return jsonify({}), 200

    try:
        bid_id = request.args.get('bidId', 'current_bid')
        file_path = get_bid_file_path(bid_id)

        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": "Bid data deleted successfully."}), 200
        else:
            return jsonify({"message": "No bid data found to delete."}), 404
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"success": False, "message": f"Error deleting bid data: {str(e)}"}), 500

# Endpoint: Fetch bid data
@app.route('/get-bid-data', methods=['OPTIONS', 'GET'])
def get_bid_data():
    if request.method == 'OPTIONS':  # Preflight request
        return jsonify({}), 200

    try:
        bid_id = request.args.get('bidId', 'current_bid')
        file_path = get_bid_file_path(bid_id)

        if not os.path.exists(file_path):
            return jsonify({"message": "No bid data found.", "data": None}), 404

        with open(file_path, 'r') as file:
            data = json.load(file)
        return jsonify({"message": "Bid data fetched successfully.", "data": data}), 200
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"success": False, "message": f"Error fetching bid data: {str(e)}"}), 500

# Endpoint: List all bids
@app.route('/list-bid-data', methods=['OPTIONS', 'GET'])
def list_bid_data():
    if request.method == 'OPTIONS':  # Preflight request
        return jsonify({}), 200

    try:
        bids_dir = 'bids'
        if not os.path.exists(bids_dir):
            return jsonify([]), 200

        bid_files = [f for f in os.listdir(bids_dir) if f.endswith('.json')]
        bid_list = []
        for bid_file in bid_files:
            file_path = os.path.join(bids_dir, bid_file)
            with open(file_path, 'r') as file:
                data = json.load(file)
                bid_list.append({
                    "id": bid_file.replace('.json', ''),
                    "clientName": data.get('clientName', 'Unknown'),
                    "opportunityName": data.get('opportunityName', 'Unknown'),
                    "lastModified": os.path.getmtime(file_path),
                })
        return jsonify(bid_list), 200
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)