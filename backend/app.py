from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re  # For regex-based filename handling
from datetime import datetime
import shutil  # For moving files

app = Flask(__name__)

# Get environment variables
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BIDS_DIR = os.getenv("BIDS_DIR", "bids")

# Enable CORS for the frontend origin
CORS(app, resources={r"/*": {"origins": FRONTEND_URL}}, supports_credentials=True)

# Ensure the `bids` directory exists
os.makedirs(BIDS_DIR, exist_ok=True)

# Utility function to get the file path for a bid
def get_bid_file_path(bid_id="current_bid"):
    return os.path.join(BIDS_DIR, f"{bid_id}.json")

# Utility function to move older versions to archive
def move_to_archive(bid_id):
    archive_dir = os.path.join(BIDS_DIR, 'Archive')
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
            latest_file_path = os.path.join(BIDS_DIR, latest_file)
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

        source_path = os.path.join(BIDS_DIR, f"{file_name}.json")
        archive_path = os.path.join(BIDS_DIR, 'Archive', f"{file_name}.json")

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

        # Total and Completed Activities
        total_activities = sum(len(activities) for activities in bid_data.get("activities", {}).values())
        completed_activities = sum(
            sum(1 for activity in activities if activity.get("status") == "Completed")
            for activities in bid_data.get("activities", {}).values()
        )

        # Completion by Track (percentage within each deliverable)
        completion_by_track = [
            {
                "name": deliverable,
                "value": len([a for a in activities if a.get("status") == "Completed"]),
                "total": len(activities),
                "completionPercentage": round(
                    (len([a for a in activities if a.get("status") == "Completed"]) / len(activities)) * 100, 2
                ) if len(activities) > 0 else 0
            }
            for deliverable, activities in bid_data.get("activities", {}).items()
        ]

        # Completion by Person (percentage of completed tasks they own)
        completion_by_person = {}
        total_activities_by_person = {}
        for activities in bid_data.get("activities", {}).values():
            for activity in activities:
                owner = activity.get("owner", "Unassigned")
                total_activities_by_person[owner] = total_activities_by_person.get(owner, 0) + 1
                if activity.get("status") == "Completed":
                    completion_by_person[owner] = completion_by_person.get(owner, 0) + 1

        completion_by_person_data = [
            {
                "name": person,
                "value": completion_by_person.get(person, 0),
                "totalActivities": total_activities_by_person.get(person, 1),
                "completionPercentage": round(
                    (completion_by_person.get(person, 0) / total_activities_by_person.get(person, 1)) * 100, 2
                ) if total_activities_by_person.get(person, 1) > 0 else 0
            }
            for person in total_activities_by_person
        ]

        # Activities by Status (Grouped by Person)
        activities_by_status = {}
        for activities in bid_data.get("activities", {}).values():
            for activity in activities:
                owner = activity.get("owner", "Unassigned")
                status = activity.get("status", "Unknown")
                if owner not in activities_by_status:
                    activities_by_status[owner] = {}
                activities_by_status[owner][status] = activities_by_status[owner].get(status, 0) + 1

        activities_by_status_chart = [
            {"owner": owner, "statuses": statuses}
            for owner, statuses in activities_by_status.items()
        ]

        # Prepare Activities List (Grouped by Deliverable)
        grouped_activities = {
            deliverable: [
                {
                    "name": activity.get("name", "Unnamed Activity"),
                    "owner": activity.get("owner", "Unassigned"),
                    "dueDate": activity.get("endDate", "N/A"),
                    "status": activity.get("status", "Unknown"),
                    "remarks": activity.get("remarks", "No Remarks"),
                }
                for activity in activities
            ]
            for deliverable, activities in bid_data.get("activities", {}).items()
        }

        # Metrics Object
        metrics = {
            "totalActivities": total_activities,
            "completedActivities": completed_activities,
            "completionByTrack": completion_by_track,
            "completionByPerson": completion_by_person_data,
        }

        # Return JSON Response
        return jsonify({
            "success": True,
            "metrics": metrics,
            "groupedActivities": grouped_activities,
            "activitiesByStatus": activities_by_status_chart,
        }), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error generating dashboard data: {str(e)}"}), 500

# Update activity status from Dashboard
@app.route('/api/bids/<bid_id>/deliverables/<deliverable>/activities', methods=['PUT'])
def update_activity(bid_id, deliverable):
    try:
        updated_activity = request.json
        file_path = get_bid_file_path(bid_id)

        if not os.path.exists(file_path):
            return jsonify({"success": False, "message": "Bid data not found."}), 404

        with open(file_path, 'r') as file:
            bid_data = json.load(file)

        # Update the specific activity
        activities = bid_data.get("activities", {}).get(deliverable, [])
        for activity in activities:
            if activity.get("name") == updated_activity.get("name"):
                activity.update(updated_activity)

        # Save the updated data
        with open(file_path, 'w') as file:
            json.dump(bid_data, file, indent=4)

        return jsonify({"success": True, "message": "Activity updated successfully."}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)