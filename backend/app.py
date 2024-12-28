from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re
from datetime import datetime
import shutil
import pytz

app = Flask(__name__)

#FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
FRONTEND_URL = os.getenv("FRONTEND_URL")

#BIDS_DIR = os.getenv("BIDS_DIR", "bids")
BIDS_DIR = "bids"

#CORS(app, resources={r"/*": {"origins": FRONTEND_URL}}, supports_credentials=True)
CORS(app, resources={r"/*": {"origins": "https://bid-management-software.vercel.app"}}, supports_credentials=True)

os.makedirs(BIDS_DIR, exist_ok=True)

# Directory for Action Trackers
ACTION_TRACKERS_DIR = os.path.join(BIDS_DIR, 'action_trackers')
os.makedirs(ACTION_TRACKERS_DIR, exist_ok=True)

# In-memory session data
session_data = {
    "context": None,
    "bidDetails": {
        "clientName": '',
        "opportunityName": '',
        "timeline": {
            "rfpIssueDate": '',
            "qaSubmissionDate": '',
            "proposalSubmissionDate": ''
        },
        "deliverables": [],
        "activities": {},
        "team": []
    },
    "all_activities": [],
    "activity_assignment_index": 0
}

DEFAULT_DELIVERABLES = ['Solution PPT', 'Rate Card', 'Commercial Proposal', 'Resource Profiles']
SUGGESTED_ACTIVITIES = {
    'Solution PPT': ['Draft', 'Review', 'Finalize'],
    'Rate Card': ['Prepare Rates', 'Approval'],
    'Commercial Proposal': ['Draft Proposal', 'Review', 'Submit'],
}

def get_bid_file_path(bid_id="current_bid"):
    return os.path.join(BIDS_DIR, f"{bid_id}.json")

def get_action_tracker_file_path(at_id):
    return os.path.join(ACTION_TRACKERS_DIR, f"{at_id}.json")

def move_to_archive(bid_id):
    archive_dir = os.path.join(BIDS_DIR, 'Archive')
    os.makedirs(archive_dir, exist_ok=True)
    file_path = get_bid_file_path(bid_id)
    if os.path.exists(file_path):
        shutil.move(file_path, os.path.join(archive_dir, f"{bid_id}.json"))
    # Move corresponding action tracker if exists
    # We'll handle action trackers separately by their naming.

def extract_version(filename):
    match = re.search(r"_version(\d+)", filename, re.IGNORECASE)
    return int(match.group(1)) if match else 1

def isValidDate(date_str):
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False

def isAfterDate(date1, date2):
    return datetime.strptime(date1, "%Y-%m-%d") > datetime.strptime(date2, "%Y-%m-%d")

def generateActivities(deliverables):
    activities = {}
    for deliverable in deliverables:
        tasks = SUGGESTED_ACTIVITIES.get(deliverable, ['Task 1'])
        activities[deliverable] = [{"name": t, "owner": "Unassigned", "status": "Pending", "startDate": "", "endDate": ""} for t in tasks]
    return activities

def formatActivities(activities):
    lines = []
    for deliverable, tasks in activities.items():
        task_names = ", ".join(f"{t['name']} (Owner: {t['owner']}, Status: {t['status']}, Start: {t['startDate']}, End: {t['endDate']})" for t in tasks)
        lines.append(f"{deliverable}: {task_names}")
    return "\n".join(lines)

def finalizeBid(bidDetails):
    try:
        bidNameBase = f"{bidDetails['clientName']}_{bidDetails['opportunityName']}"
        existing_files = [
            f for f in os.listdir(BIDS_DIR)
            if f.startswith(bidNameBase) and f.endswith('.json') and "action_trackers" not in f
        ]
        current_versions = [extract_version(f) for f in existing_files]
        newVersion = max(current_versions) + 1 if current_versions else 1
        newBidId = f"{bidNameBase}_version{newVersion}"
        newBidData = {**bidDetails, "bidId": newBidId}

        if current_versions:
            lastVersion = max(current_versions)
            previousBidId = f"{bidNameBase}_version{lastVersion}"
            move_to_archive(previousBidId)

        # Save the new bid JSON
        file_path = get_bid_file_path(newBidId)
        with open(file_path, 'w') as file:
            json.dump(newBidData, file, indent=4)

        # Initialize Action Tracker
        at_base_id = get_action_tracker_base_id(bidDetails['clientName'], bidDetails['opportunityName'])
        create_new_action_tracker_version(at_base_id, bidDetails['deliverables'])

        return f"Bid saved successfully as {newBidId} and Action Tracker initialized!"
    except Exception as e:
        return f"An error occurred while saving the bid: {str(e)}"

# Helper functions for Action Trackers
def get_action_tracker_base_id(clientName, opportunityName):
    return f"{clientName}_{opportunityName}_Action Tracker"

def get_latest_action_tracker_file(at_base_id):
    # Find all action tracker files starting with at_base_id
    if not os.path.exists(ACTION_TRACKERS_DIR):
        return None
    files = [f for f in os.listdir(ACTION_TRACKERS_DIR) if f.startswith(at_base_id) and f.endswith('.json')]
    if not files:
        return None
    current_versions = [extract_version(f) for f in files]
    latest_version = max(current_versions) if current_versions else None
    if latest_version is None:
        return None
    latest_file = f"{at_base_id}_version{latest_version}.json"
    return os.path.join(ACTION_TRACKERS_DIR, latest_file)

def archive_action_tracker(at_base_id):
    archive_dir = os.path.join(BIDS_DIR, 'Archive')
    os.makedirs(archive_dir, exist_ok=True)
    files = [f for f in os.listdir(ACTION_TRACKERS_DIR) if f.startswith(at_base_id) and f.endswith('.json')]
    if not files:
        return
    # Archive all existing versions
    for f in files:
        shutil.move(os.path.join(ACTION_TRACKERS_DIR, f), os.path.join(archive_dir, f))

def create_new_action_tracker_version(at_base_id, deliverables):
    # Check existing versions
    files = [f for f in os.listdir(ACTION_TRACKERS_DIR) if f.startswith(at_base_id) and f.endswith('.json')]
    old_action_tracker_data = None

    if files:
        existing_versions = [extract_version(f) for f in files]
        old_version = max(existing_versions)
        old_file = f"{at_base_id}_version{old_version}.json"
        old_file_path = os.path.join(ACTION_TRACKERS_DIR, old_file)

        # Load old version data before archiving
        with open(old_file_path, 'r') as old_file:
            old_action_tracker_data = json.load(old_file)

        # Archive old versions
        archive_action_tracker(at_base_id)
        new_version = old_version + 1
    else:
        # No previous versions, start fresh
        new_version = 1

    new_at_id = f"{at_base_id}_version{new_version}"
    new_at_path = get_action_tracker_file_path(new_at_id)

    if old_action_tracker_data:
        # Use old data as a base and update deliverables if needed
        old_action_tracker_data['deliverables'] = deliverables
        # old_action_tracker_data is now the template for the new version
        action_tracker_data = old_action_tracker_data
    else:
        # No old data, create a new structure
        action_tracker_data = {
            "bidId": at_base_id,  # Using at_base_id as reference. If needed, store actual bidId separately.
            "totalActions": 0,
            "openActions": 0,
            "closedActions": 0,
            "actionsByDeliverable": {},
            "owners": [],
            "deliverables": deliverables,
            "actionHistory": {}
        }

    with open(new_at_path, 'w') as at_file:
        json.dump(action_tracker_data, at_file, indent=4)

    return new_at_path

@app.before_request
def log_request_info():
    print(f"[Request] {request.method} {request.url}")
    print("[Request Headers]", request.headers)
    if request.method != 'OPTIONS':
        print(f"[Request Body] {request.get_data()}")

@app.after_request
def add_cors_headers(response):
    #response.headers["Access-Control-Allow-Origin"] = FRONTEND_URL
    response.headers["Access-Control-Allow-Origin"] = "https://bid-management-software.vercel.app"

    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

@app.route('/create-bid', methods=['OPTIONS', 'POST'])
def create_bid_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        data = request.json
        required_fields = ['clientName', 'opportunityName', 'timeline']
        timeline_fields = ['rfpIssueDate', 'qaSubmissionDate', 'proposalSubmissionDate']

        # Log incoming data
        print(f"[CREATE BID] Received data: {json.dumps(data, indent=4)}")

        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"success": False, "message": f"Field {field} is missing or empty."}), 400

        for t_field in timeline_fields:
            if t_field not in data['timeline'] or not data['timeline'][t_field]:
                return jsonify({"success": False, "message": f"Timeline field {t_field} is missing or empty."}), 400

        if not data.get('deliverables') or not any(data['deliverables']):
            return jsonify({"success": False, "message": "At least one deliverable must be selected."}), 400

        client_opportunity_prefix = f"{data['clientName']}_{data['opportunityName']}"
        version = 1
        existing_files = [
            f for f in os.listdir(BIDS_DIR) if f.startswith(client_opportunity_prefix) and f.endswith('.json')
        ]
        new_bid_data = data

        if existing_files:
            existing_versions = [extract_version(f) for f in existing_files]
            version = max(existing_versions) + 1

            latest_file = max(existing_files, key=extract_version)
            latest_file_path = os.path.join(BIDS_DIR, latest_file)
            with open(latest_file_path, 'r') as file:
                archived_data = json.load(file)

            new_bid_data = {**archived_data, **data}
            new_bid_data['timeline'] = data['timeline']
            new_bid_data['deliverables'] = data['deliverables']
            new_bid_data['bidId'] = f"{client_opportunity_prefix}_version{version}"

            move_to_archive(latest_file.replace('.json', ''))
        else:
            new_bid_data['bidId'] = f"{client_opportunity_prefix}_version{version}"

        bid_id = new_bid_data['bidId']
        file_path = get_bid_file_path(bid_id)
        with open(file_path, 'w') as file:
            json.dump(new_bid_data, file, indent=4)

        print(f"[CREATE BID] Bid created successfully: {bid_id}")
        return jsonify({"success": True, "message": f"Bid created successfully: {bid_id}", "bidId": bid_id}), 201
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error creating bid: {str(e)}"}), 500

@app.route('/move-to-archive', methods=['OPTIONS', 'POST'])
def move_to_archive_endpoint():
    if request.method == 'OPTIONS':
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

        # Move corresponding action tracker if exists
        action_tracker_path = get_action_tracker_file_path(file_name)
        if os.path.exists(action_tracker_path):
            shutil.move(action_tracker_path, os.path.join(BIDS_DIR, 'Archive', f"{file_name}_action_tracker.json"))

        return jsonify({"success": True, "message": f"File '{file_name}' moved to archive."}), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error moving file to archive: {str(e)}"}), 500

@app.route('/save-bid-data', methods=['OPTIONS', 'POST'])
def save_bid_data_route():
    if request.method == 'OPTIONS':
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

@app.route('/get-bid-data', methods=['OPTIONS', 'GET'])
def get_bid_data_route():
    if request.method == 'OPTIONS':
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

@app.route('/list-files', methods=['OPTIONS', 'GET'])
def list_files_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        bids_dir = BIDS_DIR
        archive_dir = os.path.join(bids_dir, 'Archive')
        include_archived = request.args.get('archived', 'false').lower() == 'true'

        active_files = [
            os.path.join(bids_dir, f) for f in os.listdir(bids_dir)
            if f.endswith('.json') and f != 'current_bid.json'
        ]

        archived_files = []
        if include_archived and os.path.exists(archive_dir):
            archived_files = [
                os.path.join(archive_dir, f) for f in os.listdir(archive_dir) if f.endswith('.json')
            ]

        all_files = active_files + archived_files

        file_list = []
        for file_path in all_files:
            with open(file_path, 'r') as file:
                file_data = json.load(file)
                file_list.append({
                    "id": os.path.basename(file_path).replace('.json', '').replace('_action_tracker', ''),
                    "clientName": file_data.get('clientName', 'Unknown'),
                    "opportunityName": file_data.get('opportunityName', 'Unknown'),
                    "lastModified": os.path.getmtime(file_path),
                    "archived": 'Archive' in file_path,
                })

        return jsonify({"files": file_list}), 200
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/delete-bid-data', methods=['OPTIONS', 'DELETE'])
def delete_bid_data_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        bid_id = request.args.get('bidId', 'current_bid')
        file_path = get_bid_file_path(bid_id)

        if os.path.exists(file_path):
            os.remove(file_path)
            action_tracker_path = get_action_tracker_file_path(bid_id)
            if os.path.exists(action_tracker_path):
                os.remove(action_tracker_path)
            return jsonify({"message": "Bid data deleted successfully."}), 200
        else:
            return jsonify({"message": "No bid data found to delete."}), 404
    except Exception as e:
        print(f"[Error] {str(e)}")
        return jsonify({"success": False, "message": f"Error deleting bid data: {str(e)}"}), 500

@app.route('/save-activities', methods=['POST'])
def save_activities_route():
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

@app.route('/api/dashboard', methods=['GET'], endpoint='get_dashboard_data')
def get_dashboard_data_route():
    try:
        bid_id = request.args.get('bidId', 'current_bid')
        file_path = get_bid_file_path(bid_id)
        if not os.path.exists(file_path):
            return jsonify({"success": False, "message": "Bid data not found.", "data": None}), 404

        with open(file_path, 'r') as file:
            bid_data = json.load(file)

        total_activities = sum(len(activities) for activities in bid_data.get("activities", {}).values())
        completed_activities = sum(
            sum(1 for activity in activities if activity.get("status") == "Completed")
            for activities in bid_data.get("activities", {}).values()
        )

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

        grouped_activities = {
            deliverable: [
                {
                    "name": activity.get("name", "Unnamed Activity"),
                    "owner": activity.get("owner", "Unassigned"),
                    "endDate": activity.get("endDate", "N/A"),
                    "status": activity.get("status", "Unknown"),
                    "remarks": activity.get("remarks", "No Remarks"),
                }
                for activity in activities
            ]
            for deliverable, activities in bid_data.get("activities", {}).items()
        }

        metrics = {
            "totalActivities": total_activities,
            "completedActivities": completed_activities,
            "completionByTrack": completion_by_track,
            "completionByPerson": completion_by_person_data,
        }

        return jsonify({
            "success": True,
            "metrics": metrics,
            "groupedActivities": grouped_activities,
            "activitiesByStatus": activities_by_status_chart,
        }), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error generating dashboard data: {str(e)}"}), 500

@app.route('/api/bids/<bid_id>/deliverables/<deliverable>/activities', methods=['PUT'], endpoint='update_activity')
def update_activity_route(bid_id, deliverable):
    try:
        updated_activity = request.json
        file_path = get_bid_file_path(bid_id)

        if not os.path.exists(file_path):
            return jsonify({"success": False, "message": "Bid data not found."}), 404

        with open(file_path, 'r') as file:
            bid_data = json.load(file)

        activities = bid_data.get("activities", {}).get(deliverable, [])
        for activity in activities:
            if activity.get("name") == updated_activity.get("name"):
                activity.update(updated_activity)

        with open(file_path, 'w') as file:
            json.dump(bid_data, file, indent=4)

        # Update Action Tracker metrics if exists
        # Note: Action tracker ID differs from bid_id. We must derive it.
        # If bid_id = Client_Opportunity_versionX, action tracker base = Client_Opportunity_Action Tracker
        parts = bid_id.split('_')
        if len(parts) > 2:
            # last part is version
            clientName = parts[0]
            opportunityName = "_".join(parts[1:-1])  # rejoin middle parts
            at_base_id = get_action_tracker_base_id(clientName, opportunityName)
            action_tracker_file = get_latest_action_tracker_file(at_base_id)
            if action_tracker_file and os.path.exists(action_tracker_file):
                with open(action_tracker_file, 'r') as at_file:
                    action_tracker = json.load(at_file)

                action_tracker['totalActions'] = sum(len(acts) for acts in bid_data.get("activities", {}).values())
                action_tracker['openActions'] = sum(
                    sum(1 for act in acts if act.get("status") != "Completed")
                    for acts in bid_data.get("activities", {}).values()
                )
                action_tracker['closedActions'] = sum(
                    sum(1 for act in acts if act.get("status") == "Completed")
                    for acts in bid_data.get("activities", {}).values()
                )

                with open(action_tracker_file, 'w') as at_file:
                    json.dump(action_tracker, at_file, indent=4)

        return jsonify({"success": True, "message": "Activity updated successfully."}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/')
def home_route():
    return jsonify({"message": "Backend is running successfully!"}), 200

# Action Tracker endpoints
@app.route('/api/action-trackers/<bid_id>', methods=['OPTIONS', 'GET'])
def get_action_tracker_route(bid_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        # Convert bid_id to action tracker base id by removing version and adding Action Tracker
        parts = bid_id.split('_')
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Invalid bidID format for Action Tracker."}), 400
        clientName = parts[0]
        opportunityName = "_".join(parts[1:-1])
        at_base_id = get_action_tracker_base_id(clientName, opportunityName)

        at_file = get_latest_action_tracker_file(at_base_id)
        if not at_file:
            return jsonify({"success": False, "message": "Action Tracker not found for this Bid ID.", "data": None}), 404

        with open(at_file, 'r') as at_f:
            action_tracker_data = json.load(at_f)

        return jsonify({"success": True, "data": action_tracker_data}), 200
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error fetching Action Tracker data: {str(e)}"}), 500

@app.route('/api/action-trackers', methods=['OPTIONS', 'POST'])
def create_action_tracker_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        data = request.json
        bid_id = data.get('bidId')

        if not bid_id:
            return jsonify({"success": False, "message": "Bid ID is required."}), 400

        bid_file_path = get_bid_file_path(bid_id)
        if not os.path.exists(bid_file_path):
            return jsonify({"success": False, "message": "Bid not found."}), 404

        with open(bid_file_path, 'r') as bid_file:
            bid_data = json.load(bid_file)

        # Build action tracker base id
        parts = bid_id.split('_')
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Invalid bid ID format."}), 400
        clientName = parts[0]
        opportunityName = "_".join(parts[1:-1])
        at_base_id = get_action_tracker_base_id(clientName, opportunityName)

        new_file_path = create_new_action_tracker_version(at_base_id, bid_data.get("deliverables", []))
        with open(new_file_path, 'r') as nf:
            action_tracker_data = json.load(nf)

        return jsonify({"success": True, "message": "Action Tracker created successfully.", "data": action_tracker_data}), 201

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error creating Action Tracker: {str(e)}"}), 500

@app.route('/api/action-trackers/<bid_id>', methods=['OPTIONS', 'PUT'])
def update_action_tracker_route(bid_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        parts = bid_id.split('_')
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Invalid bid ID format for Action Tracker."}), 400
        clientName = parts[0]
        opportunityName = "_".join(parts[1:-1])
        at_base_id = get_action_tracker_base_id(clientName, opportunityName)

        at_file = get_latest_action_tracker_file(at_base_id)
        if not at_file:
            return jsonify({"success": False, "message": "Action Tracker not found for this Bid ID."}), 404

        updates = request.json
        with open(at_file, 'r') as at_f:
            action_tracker_data = json.load(at_f)

        action_tracker_data.update(updates)

        with open(at_file, 'w') as at_f:
            json.dump(action_tracker_data, at_f, indent=4)

        return jsonify({"success": True, "message": "Action Tracker updated successfully.", "data": action_tracker_data}), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error updating Action Tracker: {str(e)}"}), 500

@app.route('/api/action-trackers/<bid_id>/actions', methods=['OPTIONS', 'POST'])
def add_action_route(bid_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        action = request.json
        deliverable = action.get('deliverable')
        owner = action.get('owner')
        status = action.get('status', 'Pending')

        # actionId is now generated automatically
        if not deliverable or not owner:
            return jsonify({"success": False, "message": "Deliverable and Owner are required"}), 400

        parts = bid_id.split('_')
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Invalid bid ID format for Action Tracker."}), 400
        clientName = parts[0]
        opportunityName = "_".join(parts[1:-1])
        at_base_id = get_action_tracker_base_id(clientName, opportunityName)

        at_file = get_latest_action_tracker_file(at_base_id)
        if not at_file:
            return jsonify({"success": False, "message": "Action Tracker not found for this Bid ID."}), 404

        with open(at_file, 'r') as at_f:
            action_tracker_data = json.load(at_f)

        if deliverable not in action_tracker_data.get("deliverables", []):
            return jsonify({"success": False, "message": "Invalid Deliverable."}), 400

        if deliverable not in action_tracker_data["actionsByDeliverable"]:
            action_tracker_data["actionsByDeliverable"][deliverable] = []

        # Generate a new actionId by finding max existing one
        max_id = 0
        for acts in action_tracker_data["actionsByDeliverable"].values():
            for a in acts:
                try:
                    aid = int(a["actionId"])
                    if aid > max_id:
                        max_id = aid
                except:
                    pass
        new_id = max_id + 1

        new_action = {
            "actionId": str(new_id),
            "name": action.get("name"),
            "deliverable": action.get("deliverable"),
            "owner": owner,
            "endDate": action.get("endDate"),
            "status": status,
            "remarks": action.get("remarks", ""),
        }

        action_tracker_data["actionsByDeliverable"][deliverable].append(new_action)

        # Recalculate total, open, closed actions
        total = 0
        closed = 0
        open_count = 0
        owners_set = set()
        for dacts in action_tracker_data["actionsByDeliverable"].values():
            for a in dacts:
                total += 1
                owners_set.add(a["owner"])
                if a["status"].lower() == "completed":
                    closed += 1
                else:
                    open_count += 1

        action_tracker_data["totalActions"] = total
        action_tracker_data["openActions"] = open_count
        action_tracker_data["closedActions"] = closed
        action_tracker_data["owners"] = list(owners_set)

        action_tracker_data["actionHistory"][str(new_id)] = [{
            "date": action.get("createdDate", ""),
            "changedBy": action.get("changedBy", "system"),
            "change": "Action Created"
        }]

        with open(at_file, 'w') as at_f:
            json.dump(action_tracker_data, at_f, indent=4)

        return jsonify({"success": True, "message": "Action added successfully.", "data": new_action}), 201
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error adding action: {str(e)}"}), 500

# Ensure update_existing_action, delete actions also re-calculate metrics in a similar manner
@app.route('/api/action-trackers/<bid_id>/actions/<action_id>', methods=['OPTIONS', 'DELETE'])
def delete_action_route(bid_id, action_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        parts = bid_id.split('_')
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Invalid bid ID format for Action Tracker."}), 400
        clientName = parts[0]
        opportunityName = "_".join(parts[1:-1])
        at_base_id = get_action_tracker_base_id(clientName, opportunityName)

        at_file = get_latest_action_tracker_file(at_base_id)
        if not at_file:
            return jsonify({"success": False, "message": "Action Tracker not found for this Bid ID."}), 404

        with open(at_file, 'r') as at_f:
            action_tracker_data = json.load(at_f)

        action_found = False
        removed_action = None
        for deliverable, actions in action_tracker_data.get("actionsByDeliverable", {}).items():
            for action in actions:
                if action.get("actionId") == action_id:
                    removed_action = action
                    actions.remove(action)
                    action_found = True
                    if not actions:
                        del action_tracker_data["actionsByDeliverable"][deliverable]
                    break
            if action_found:
                break

        if not action_found:
            return jsonify({"success": False, "message": "Action ID not found."}), 404

        # Recalculate metrics
        total = 0
        closed = 0
        open_count = 0
        owners_set = set()
        for dacts in action_tracker_data["actionsByDeliverable"].values():
            for a in dacts:
                total += 1
                owners_set.add(a["owner"])
                if a["status"].lower() == "completed":
                    closed += 1
                else:
                    open_count += 1

        action_tracker_data["totalActions"] = total
        action_tracker_data["openActions"] = open_count
        action_tracker_data["closedActions"] = closed
        action_tracker_data["owners"] = list(owners_set)

        if action_id in action_tracker_data.get("actionHistory", {}):
            del action_tracker_data["actionHistory"][action_id]

        with open(at_file, 'w') as at_f:
            json.dump(action_tracker_data, at_f, indent=4)

        return jsonify({"success": True, "message": "Action deleted successfully."}), 200
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error deleting action: {str(e)}"}), 500

@app.route('/api/action-trackers/<bid_id>/actions/<action_id>', methods=['OPTIONS', 'PUT'])
def update_action_endpoint(bid_id, action_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        updated_data = request.json

        # Derive at_base_id
        parts = bid_id.split('_')
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Invalid bid ID format for Action Tracker."}), 400
        clientName = parts[0]
        opportunityName = "_".join(parts[1:-1])
        at_base_id = get_action_tracker_base_id(clientName, opportunityName)

        at_file = get_latest_action_tracker_file(at_base_id)
        if not at_file:
            return jsonify({"success": False, "message": "Action Tracker not found for this Bid ID."}), 404

        with open(at_file, 'r') as at_f:
            action_tracker_data = json.load(at_f)

        # We must find the action's old location (old deliverable)
        old_deliverable = None
        old_action = None
        for d, actions in action_tracker_data.get("actionsByDeliverable", {}).items():
            for a in actions:
                if a.get("actionId") == action_id:
                    old_deliverable = d
                    old_action = a.copy()  # keep old state for comparison
                    break
            if old_deliverable is not None:
                break

        if not old_deliverable:
            return jsonify({"success": False, "message": "Action not found."}), 404

        # If deliverable changed, we must move the action
        new_deliverable = updated_data.get("deliverable", old_action.get("deliverable", old_deliverable))

        # Remove from old deliverable
        # Find the action in old_deliverable and remove it
        for idx, act in enumerate(action_tracker_data["actionsByDeliverable"][old_deliverable]):
            if act["actionId"] == action_id:
                action_tracker_data["actionsByDeliverable"][old_deliverable].pop(idx)
                break
        # If new deliverable doesn't exist in dictionary, create it
        if new_deliverable not in action_tracker_data["actionsByDeliverable"]:
            action_tracker_data["actionsByDeliverable"][new_deliverable] = []

        # Prepare updated action
        updated_action = old_action.copy()
        for key, val in updated_data.items():
            if key not in ["changedFields", "changedDate", "changedBy"]:
                updated_action[key] = val

        # Add the action to the new deliverable
        action_tracker_data["actionsByDeliverable"][new_deliverable].append(updated_action)

        # Recalculate metrics
        total = 0
        closed = 0
        owners_set = set()
        for acts in action_tracker_data["actionsByDeliverable"].values():
            for a in acts:
                total += 1
                owners_set.add(a.get("owner", "Unassigned"))
                if a.get("status", "").lower() == "completed":
                    closed += 1
        open_count = total - closed
        action_tracker_data["totalActions"] = total
        action_tracker_data["openActions"] = open_count
        action_tracker_data["closedActions"] = closed
        action_tracker_data["owners"] = list(owners_set)

        # Record history
        # If action_id not in actionHistory, create empty list
        if action_id not in action_tracker_data["actionHistory"]:
            action_tracker_data["actionHistory"][action_id] = []

        # Get IST timestamp if not provided
        ist = pytz.timezone('Asia/Kolkata')
        changedDate = updated_data.get("changedDate")
        if not changedDate:
            changedDate = datetime.now(ist).isoformat()

        # changedFields is passed from frontend, store them as is
        changedFields = updated_data.get("changedFields", [])

        action_tracker_data["actionHistory"][action_id].append({
            "date": changedDate,
            "changedBy": updated_data.get("changedBy", "user"),
            "changedFields": changedFields,
            "change": "Action Updated"
        })

        # Write back to file
        with open(at_file, 'w') as at_f:
            json.dump(action_tracker_data, at_f, indent=4)

        return jsonify({"success": True, "message": "Action updated successfully."}), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
@app.route('/api/action-trackers/<bid_id>/actions/<action_id>/history', methods=['OPTIONS', 'GET'])
def get_action_history_route(bid_id, action_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        parts = bid_id.split('_')
        if len(parts) < 3:
            return jsonify({"success": False, "message": "Invalid bid ID format for Action Tracker."}), 400
        clientName = parts[0]
        opportunityName = "_".join(parts[1:-1])
        at_base_id = get_action_tracker_base_id(clientName, opportunityName)

        at_file = get_latest_action_tracker_file(at_base_id)
        if not at_file:
            return jsonify({"success": False, "message": "Action Tracker not found."}), 404

        with open(at_file, 'r') as at_f:
            action_tracker_data = json.load(at_f)

        history = action_tracker_data.get("actionHistory", {}).get(action_id, [])
        return jsonify({"success": True, "history": history}), 200
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/finalize_bid', methods=['OPTIONS', 'POST'])
def finalize_bid_route():
    if request.method == 'OPTIONS':
        # CORS preflight request, handled by flask_cors
        return jsonify({}), 200

    try:
        data = request.json

        if not data:
            return jsonify({"success": False, "message": "No data provided."}), 400

        # Extract bidDetails from the nested structure
        bidDetails = data.get('bidDetails')

        if not bidDetails:
            return jsonify({"success": False, "message": "bidDetails are missing."}), 400

        # Log bidDetails to verify integrity
        print(f"[FINALIZE BID] Received bidDetails: {json.dumps(bidDetails, indent=4)}")

        # Validate required fields
        required_fields = ['clientName', 'opportunityName', 'timeline', 'deliverables', 'activities', 'team']
        timeline_fields = ['rfpIssueDate', 'qaSubmissionDate', 'proposalSubmissionDate']

        for field in required_fields:
            if field not in bidDetails or not bidDetails[field]:
                return jsonify({"success": False, "message": f"Field '{field}' is missing or empty."}), 400

        for t_field in timeline_fields:
            if t_field not in bidDetails['timeline'] or not bidDetails['timeline'][t_field]:
                return jsonify({"success": False, "message": f"Timeline field '{t_field}' is missing or empty."}), 400

        # Call the existing finalizeBid function
        message = finalizeBid(bidDetails)

        if "error" in message.lower():
            return jsonify({"success": False, "message": message}), 500
        else:
            return jsonify({"success": True, "message": message}), 200

    except Exception as e:
        print(f"[FINALIZE BID ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500
        
@app.route('/chatbot', methods=['POST'])
def chatbot_route():
    try:
        data = request.json
        query = data.get("query", "").strip()
        if not query:
            return jsonify({"response": "Please say something!"})

        lowerInput = query.lower()
        context = session_data["context"]
        bidDetails = session_data["bidDetails"]

        # If no context is set, guess user intent
        if context is None:
            if "new bid" in lowerInput or "create a bid" in lowerInput or "start a bid" in lowerInput:
                session_data["context"] = "client_name"
                return jsonify({
                    "response": "Great! Let’s start with the client name. What is the client name?"
                })
            elif "summarize the current bid" in lowerInput:
                current_bid_path = get_bid_file_path("current_bid")
                if not os.path.exists(current_bid_path):
                    return jsonify({"response": "No current bid data found to summarize."})
                with open(current_bid_path, "r") as file:
                    cbid_data = json.load(file)
                    summary = {
                        "Client Name": cbid_data.get("clientName", "N/A"),
                        "Opportunity Name": cbid_data.get("opportunityName", "N/A"),
                        "RFP Dates": cbid_data.get("timeline", {}),
                        "Deliverables": cbid_data.get("deliverables", []),
                    }
                    return jsonify({
                        "response": f"Summary:\nClient: {summary['Client Name']}\nOpportunity: {summary['Opportunity Name']}\n"
                                    f"RFP Timeline: {summary['RFP Dates']}\nDeliverables: {', '.join(summary['Deliverables'])}"
                    })
            elif "help" in lowerInput:
                return jsonify({"response": "I can assist with creating bids, summarizing existing bids, and managing deliverables. Ask me a question!"})
            else:
                return jsonify({"response": "I'm sorry, I didn't understand that. Can you rephrase?"})

        # Handle different contexts
        if context == "client_name":
            if len(query) < 3:
                return jsonify({"response": "Client name is too short. Please provide a valid name."})
            else:
                bidDetails["clientName"] = query
                session_data["context"] = "opportunity_name"
                return jsonify({"response": "What is the opportunity name?"})

        elif context == "opportunity_name":
            bidDetails["opportunityName"] = query
            session_data["context"] = "rfp_issue_date"
            return jsonify({"response": "What is the RFP Issue Date? (Format: YYYY-MM-DD)"})

        elif context == "rfp_issue_date":
            if isValidDate(query):
                bidDetails["timeline"]["rfpIssueDate"] = query
                session_data["context"] = "qa_submission_date"
                return jsonify({"response": "What is the QA Submission Date? (Format: YYYY-MM-DD)"})
            else:
                return jsonify({"response": "That doesn’t look like a valid date. Please try again."})

        elif context == "qa_submission_date":
            if isValidDate(query):
                bidDetails["timeline"]["qaSubmissionDate"] = query
                session_data["context"] = "proposal_submission_date"
                return jsonify({"response": "What is the Proposal Submission Date? (Format: YYYY-MM-DD)"})
            else:
                return jsonify({"response": "Invalid date. Please provide a valid QA Submission Date."})

        elif context == "proposal_submission_date":
            if isValidDate(query) and isAfterDate(query, bidDetails["timeline"]["rfpIssueDate"]):
                bidDetails["timeline"]["proposalSubmissionDate"] = query
                session_data["context"] = "deliverables"
                return jsonify({
                    "response": f"Here are some default deliverables, or type your own (comma-separated).",
                    "suggestions": DEFAULT_DELIVERABLES
                })
            else:
                return jsonify({"response": "Invalid Proposal Submission Date. Ensure it is after the RFP Issue Date."})

        elif context == "deliverables":
            deliverables = [d.strip() for d in query.split(',') if d.strip()]
            if not deliverables:
                return jsonify({"response": "Please provide at least one deliverable."})
            else:
                activities = generateActivities(deliverables)
                bidDetails["deliverables"] = deliverables
                bidDetails["activities"] = activities
                session_data["context"] = "team"
                return jsonify({"response": f"Deliverables set: {', '.join(deliverables)}. Suggested activities generated.\nWho are the team members? Provide names separated by commas."})

        elif context == "team":
            team = [name.strip() for name in query.split(',') if name.strip()]
            if not team:
                return jsonify({"response": "Please provide at least one team member."})
            else:
                bidDetails["team"] = [{"name": t, "role": ""} for t in team]
                # After setting team, we assign owners/dates/status for each activity
                all_activities = []
                for d, acts in bidDetails["activities"].items():
                    for act in acts:
                        all_activities.append((d, act["name"]))

                session_data["all_activities"] = all_activities
                session_data["activity_assignment_index"] = 0

                if not all_activities:
                    # No activities? Just finalize
                    session_data["context"] = "review"
                    summary = (
                        f"Here’s your bid summary:\n"
                        f"Client: {bidDetails['clientName']}\n"
                        f"Opportunity: {bidDetails['opportunityName']}\n"
                        f"Timeline: RFP Issue - {bidDetails['timeline']['rfpIssueDate']}, "
                        f"QA Submission - {bidDetails['timeline']['qaSubmissionDate']}, "
                        f"Proposal Submission - {bidDetails['timeline']['proposalSubmissionDate']}\n"
                        f"Deliverables: {', '.join(bidDetails['deliverables'])}\n"
                        f"Activities:\n{formatActivities(bidDetails['activities'])}\n"
                        f"Team: {', '.join([m['name'] for m in bidDetails['team']])}\n\n"
                        "Type \"finalize\" to save or \"edit\" to make changes."
                    )
                    return jsonify({"response": summary})

                session_data["context"] = "assign_owners"
                d, a = all_activities[0]
                team_members = [m["name"] for m in bidDetails["team"]]
                return jsonify({
                    "response": f"Who should be the owner of '{a}' under '{d}'?",
                    "suggestions": team_members
                })

        elif context == "assign_owners":
            idx = session_data["activity_assignment_index"]
            all_activities = session_data["all_activities"]
            d, a = all_activities[idx]

            team_members = [m["name"] for m in bidDetails["team"]]
            if query not in team_members:
                return jsonify({"response": f"Please choose a valid owner from: {', '.join(team_members)}"})

            # Assign owner
            for act in bidDetails["activities"][d]:
                if act["name"] == a:
                    act["owner"] = query

            session_data["context"] = "assign_start_date"
            return jsonify({"response": f"What is the start date for '{a}'? (Format: YYYY-MM-DD)"})

        elif context == "assign_start_date":
            idx = session_data["activity_assignment_index"]
            all_activities = session_data["all_activities"]
            d, a = all_activities[idx]

            if not isValidDate(query):
                return jsonify({"response": "Invalid date format. Please enter start date in YYYY-MM-DD format."})

            # Assign start date
            for act in bidDetails["activities"][d]:
                if act["name"] == a:
                    act["startDate"] = query

            session_data["context"] = "assign_end_date"
            return jsonify({"response": f"What is the end date for '{a}'? (Format: YYYY-MM-DD)"})

        elif context == "assign_end_date":
            idx = session_data["activity_assignment_index"]
            all_activities = session_data["all_activities"]
            d, a = all_activities[idx]

            if not isValidDate(query):
                return jsonify({"response": "Invalid date format. Please enter end date in YYYY-MM-DD format."})

            # Assign end date
            for act in bidDetails["activities"][d]:
                if act["name"] == a:
                    act["endDate"] = query

            session_data["context"] = "assign_status"
            return jsonify({
                "response": f"What is the status for '{a}'?",
                "suggestions": ["Pending", "In Progress", "Completed"]
            })

        elif context == "assign_status":
            idx = session_data["activity_assignment_index"]
            all_activities = session_data["all_activities"]
            d, a = all_activities[idx]

            valid_statuses = ["Pending", "In Progress", "Completed"]
            if query not in valid_statuses:
                return jsonify({"response": f"Please choose a valid status: {', '.join(valid_statuses)}"})

            # Assign status
            for act in bidDetails["activities"][d]:
                if act["name"] == a:
                    act["status"] = query

            # Move to next activity or finalize
            idx += 1
            session_data["activity_assignment_index"] = idx
            if idx < len(all_activities):
                d, a = all_activities[idx]
                session_data["context"] = "assign_owners"
                team_members = [m["name"] for m in bidDetails["team"]]
                return jsonify({
                    "response": f"Who should be the owner of '{a}' under '{d}'?",
                    "suggestions": team_members
                })
            else:
                # All activities assigned, move to review
                session_data["context"] = "review"
                summary = (
                    f"Here’s your bid summary:\n"
                    f"Client: {bidDetails['clientName']}\n"
                    f"Opportunity: {bidDetails['opportunityName']}\n"
                    f"Timeline: RFP Issue - {bidDetails['timeline']['rfpIssueDate']}, "
                    f"QA Submission - {bidDetails['timeline']['qaSubmissionDate']}, "
                    f"Proposal Submission - {bidDetails['timeline']['proposalSubmissionDate']}\n"
                    f"Deliverables: {', '.join(bidDetails['deliverables'])}\n"
                    f"Activities:\n{formatActivities(bidDetails['activities'])}\n"
                    f"Team: {', '.join([m['name'] for m in bidDetails['team']])}\n\n"
                    "Type \"finalize\" to save or \"edit\" to make changes."
                )
                return jsonify({"response": summary})

        elif context == "review":
            if lowerInput == "finalize":
                msg = finalizeBid(bidDetails)
                # Initialize Action Tracker within finalizeBid
                # Reset session data after finalizing if desired
                session_data["context"] = None
                session_data["bidDetails"] = {
                    "clientName": '',
                    "opportunityName": '',
                    "timeline": {
                        "rfpIssueDate": '',
                        "qaSubmissionDate": '',
                        "proposalSubmissionDate": ''
                    },
                    "deliverables": [],
                    "activities": {},
                    "team": []
                }
                session_data["all_activities"] = []
                session_data["activity_assignment_index"] = 0
                return jsonify({"response": msg})
            elif lowerInput.startswith("edit"):
                return jsonify({"response": "Editing functionality not implemented. Please finalize or type another command."})
            else:
                return jsonify({"response": "Type \"finalize\" to save or \"edit <field>\" to make changes."})

        return jsonify({"response": "I'm sorry, I didn’t quite catch that. Can you rephrase?"})

    except Exception as e:
        print(f"[CHATBOT ERROR] {str(e)}")
        return jsonify({"response": f"An error occurred: {str(e)}"}), 500
    
@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad Request', 'message': error.description}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not Found', 'message': error.description}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal Server Error', 'message': 'An unexpected error occurred.'}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)