from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re  # For regex-based filename handling
from datetime import datetime
import shutil  # For moving files

app = Flask(__name__)

# Enable CORS for frontend origin
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)

# Ensure the `bids` directory exists
os.makedirs('bids', exist_ok=True)

# Utility function to get the file path for a bid
def get_bid_file_path(bid_id="current_bid"):
    return os.path.join('bids', f"{bid_id}.json")

# Utility function to move older versions to archive
def move_to_archive(bid_id):
    archive_dir = os.path.join('bids', 'Archive')
    os.makedirs(archive_dir, exist_ok=True)

    file_path = get_bid_file_path(bid_id)
    if os.path.exists(file_path):
        shutil.move(file_path, os.path.join(archive_dir, f"{bid_id}.json"))

# Utility function to extract version number from filename
def extract_version(filename):
    match = re.search(r"_Version(\d+)", filename)
    return int(match.group(1)) if match else 1

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

# Endpoint: Create a new bid with versioning and archiving
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
                return jsonify({"success": False, "message": f"Field {field} is missing or empty."}), 400

        # Validate nested timeline fields
        for t_field in timeline_fields:
            if t_field not in data['timeline'] or not data['timeline'][t_field]:
                return jsonify({"success": False, "message": f"Timeline field {t_field} is missing or empty."}), 400

        # Validate deliverables
        if not data.get('deliverables') or not any(data['deliverables']):
            return jsonify({"success": False, "message": "At least one deliverable must be selected."}), 400

        # Determine the new version number
        client_opportunity_prefix = f"{data['clientName']}_{data['opportunityName']}"
        version = 1
        existing_files = [
            f for f in os.listdir('bids') if f.startswith(client_opportunity_prefix) and f.endswith('.json')
        ]
        new_bid_data = data  # Start with incoming data as the base

        if existing_files:
            existing_versions = [extract_version(f) for f in existing_files]
            version = max(existing_versions) + 1

            # Archive the most recent file
            latest_file = max(existing_files, key=extract_version)
            latest_file_path = os.path.join('bids', latest_file)
            with open(latest_file_path, 'r') as file:
                archived_data = json.load(file)

            # Update new bid data with all fields from the archived data, retaining existing values
            new_bid_data = {**archived_data, **data}  # Merge data
            new_bid_data['timeline'] = data['timeline']  # Overwrite with updated timeline
            new_bid_data['deliverables'] = data['deliverables']  # Overwrite deliverables
            new_bid_data['bidId'] = f"{client_opportunity_prefix}_Version{version}"  # Update bid ID

            # Archive the existing file
            move_to_archive(latest_file.replace('.json', ''))

        # Save the new bid with the new version number
        bid_id = f"{client_opportunity_prefix}_Version{version}"
        file_path = get_bid_file_path(bid_id)
        with open(file_path, 'w') as file:
            json.dump(new_bid_data, file, indent=4)

        print("[DEBUG] Bid created successfully:", bid_id)
        return jsonify({"success": True, "message": f"Bid created successfully: {bid_id}", "bidId": bid_id}), 201
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error creating bid: {str(e)}"}), 500

# Endpoint: Move a file to the Archive folder
@app.route('/move-to-archive', methods=['OPTIONS', 'POST'])
def move_to_archive_endpoint():
    if request.method == 'OPTIONS':  # Handle preflight request
        return jsonify({}), 200

    try:
        data = request.json
        file_name = data.get('fileName')

        if not file_name:
            return jsonify({"success": False, "message": "File name is required."}), 400

        source_path = os.path.join('bids', f"{file_name}.json")
        archive_path = os.path.join('bids', 'Archive', f"{file_name}.json")

        if not os.path.exists(source_path):
            return jsonify({"success": False, "message": "File not found."}), 404

        shutil.move(source_path, archive_path)
        return jsonify({"success": True, "message": f"File '{file_name}' moved to archive."}), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error moving file to archive: {str(e)}"}), 500

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

# Endpoint: Fetch bid data
@app.route('/get-bid-data', methods=['OPTIONS', 'GET'])
def get_bid_data():
    if request.method == 'OPTIONS':  # Preflight request
        return jsonify({}), 200

    try:
        bid_id = request.args.get('bidId', 'current_bid')  # Default to 'current_bid'
        file_path = get_bid_file_path(bid_id)

        if not os.path.exists(file_path):
            return jsonify({"message": "No bid data found.", "data": None}), 404

        with open(file_path, 'r') as file:
            data = json.load(file)
        return jsonify({"message": "Bid data fetched successfully.", "data": data}), 200
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"success": False, "message": f"Error fetching bid data: {str(e)}"}), 500

# Endpoint: List all files (including archive)
@app.route('/list-files', methods=['OPTIONS', 'GET'])
def list_files():
    if request.method == 'OPTIONS':  # Preflight request
        return jsonify({}), 200

    try:
        bids_dir = 'bids'
        archive_dir = os.path.join(bids_dir, 'Archive')
        include_archived = request.args.get('archived', 'false').lower() == 'true'

        # Collect files in the active directory
        active_files = [
            os.path.join(bids_dir, f) for f in os.listdir(bids_dir) if f.endswith('.json') and f != 'current_bid.json'
        ]

        # Include archived files if requested
        archived_files = []
        if include_archived and os.path.exists(archive_dir):
            archived_files = [
                os.path.join(archive_dir, f) for f in os.listdir(archive_dir) if f.endswith('.json')
            ]

        all_files = active_files + archived_files

        # Prepare the response data
        file_list = []
        for file_path in all_files:
            with open(file_path, 'r') as file:
                data = json.load(file)
                file_list.append({
                    "id": os.path.basename(file_path).replace('.json', ''),
                    "clientName": data.get('clientName', 'Unknown'),
                    "opportunityName": data.get('opportunityName', 'Unknown'),
                    "lastModified": os.path.getmtime(file_path),
                    "archived": 'Archive' in file_path,
                })

        return jsonify({"files": file_list}), 200
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"error": str(e)}), 500

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

# Endpoint: Save activities
@app.route('/save-activities', methods=['POST'])
def save_activities():
    data = request.json
    deliverable = data.get('deliverable')
    activities = data.get('activities')

    if not deliverable or not activities:
        return jsonify({"success": False, "message": "Invalid data"}), 400

    bid_id = "current_bid"
    file_path = get_bid_file_path(bid_id)

    with open(file_path, 'r') as file:
        bid_data = json.load(file)

    bid_data['activities'] = bid_data.get('activities', {})
    bid_data['activities'][deliverable] = activities

    with open(file_path, 'w') as file:
        json.dump(bid_data, file, indent=4)

    return jsonify({"success": True, "message": "Activities saved successfully"})

# Endpoint: Get dashboard data
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        bid_id = request.args.get('bidId', 'current_bid')
        file_path = get_bid_file_path(bid_id)
        print(f"[DEBUG] Received bidId: {bid_id}")
        print(f"[DEBUG] File path resolved to: {file_path}")

        if not os.path.exists(file_path):
            return jsonify({"success": False, "message": "Bid data not found.", "data": None}), 404

        with open(file_path, 'r') as file:
            bid_data = json.load(file)

        # Generate metrics
        completion_by_track = [
            {"name": key, "value": sum(activity.get("progress", 0) for activity in activities)}
            for key, activities in bid_data.get('activities', {}).items()
        ]

        completion_by_person = {}
        for activities in bid_data.get('activities', {}).values():
            for activity in activities:
                owner = activity.get('owner', 'Unassigned')
                completion_by_person[owner] = completion_by_person.get(owner, 0) + activity.get('progress', 0)

        upcoming_milestones = [
            {"name": milestone, "date": bid_data['timeline'].get(milestone)}
            for milestone in ['rfpIssueDate', 'qaSubmissionDate', 'proposalSubmissionDate']
            if milestone in bid_data['timeline']
        ]

        metrics = {
            "completionByTrack": completion_by_track,
            "completionByPerson": [{"name": key, "value": value} for key, value in completion_by_person.items()],
            "upcomingMilestones": upcoming_milestones,
        }

        # Prepare activities
        activities = [
            {"name": activity.get("name"), "owner": activity.get("owner"), "dueDate": activity.get("dueDate")}
            for activities in bid_data.get('activities', {}).values()
            for activity in activities
        ]

        # Prepare action tracker
        action_tracker = [
            {
                "activity": activity.get("name"),
                "status": activity.get("status"),
                "actions": activity.get("actions"),
                "remarks": activity.get("remarks"),
            }
            for activities in bid_data.get('activities', {}).values()
            for activity in activities
        ]

        return jsonify({
            "success": True,
            "metrics": metrics,
            "activities": activities,
            "actionTracker": action_tracker,
        }), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error generating dashboard data: {str(e)}"}), 500
    
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)