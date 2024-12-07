from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import re
from datetime import datetime
import shutil

app = Flask(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL")
BIDS_DIR = "bids"

CORS(app, resources={r"/*": {"origins": "https://bid-management-software.vercel.app"}}, supports_credentials=True)

os.makedirs(BIDS_DIR, exist_ok=True)

# In-memory session data (single user scenario for demo)
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

def move_to_archive(bid_id):
    archive_dir = os.path.join(BIDS_DIR, 'Archive')
    os.makedirs(archive_dir, exist_ok=True)
    file_path = get_bid_file_path(bid_id)
    if os.path.exists(file_path):
        shutil.move(file_path, os.path.join(archive_dir, f"{bid_id}.json"))

def extract_version(filename):
    match = re.search(r"_Version(\d+)", filename)
    return int(match.group(1)) if match else 1

@app.before_request
def log_request_info():
    print(f"[Request] {request.method} {request.url}")
    print(f"[Request Headers] {request.headers}")
    if request.method != 'OPTIONS':
        print(f"[Request Body] {request.get_data()}")

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "https://bid-management-software.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

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
            if f.startswith(bidNameBase) and f.endswith('.json')
        ]
        current_versions = [extract_version(f) for f in existing_files]
        newVersion = (max(current_versions) + 1) if current_versions else 1
        newBidId = f"{bidNameBase}_Version{newVersion}"
        newBidData = {**bidDetails, "bidId": newBidId}

        if current_versions:
            lastVersion = max(current_versions)
            previousBidId = f"{bidNameBase}_Version{lastVersion}"
            move_to_archive(previousBidId)

        file_path = get_bid_file_path(newBidId)
        with open(file_path, 'w') as file:
            json.dump(newBidData, file, indent=4)

        return f"Bid saved successfully as {newBidId}!"
    except Exception as e:
        return f"An error occurred while saving the bid: {str(e)}"

@app.route('/create-bid', methods=['OPTIONS', 'POST'])
def create_bid():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        print("[DEBUG] Incoming data:", data)
        required_fields = ['clientName', 'opportunityName', 'timeline']
        timeline_fields = ['rfpIssueDate', 'qaSubmissionDate', 'proposalSubmissionDate']

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
            new_bid_data['bidId'] = f"{client_opportunity_prefix}_Version{version}"

            move_to_archive(latest_file.replace('.json', ''))

        bid_id = f"{client_opportunity_prefix}_Version{version}"
        file_path = get_bid_file_path(bid_id)
        with open(file_path, 'w') as file:
            json.dump(new_bid_data, file, indent=4)

        print("[DEBUG] Bid created successfully:", bid_id)
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
        return jsonify({"success": True, "message": f"File '{file_name}' moved to archive."}), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": f"Error moving file to archive: {str(e)}"}), 500

@app.route('/save-bid-data', methods=['OPTIONS', 'POST'])
def save_bid_data():
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
def get_bid_data():
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
def list_files():
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
                    "id": os.path.basename(file_path).replace('.json', ''),
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
def delete_bid_data():
    if request.method == 'OPTIONS':
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
                    "dueDate": activity.get("endDate", "N/A"),
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

@app.route('/api/bids/<bid_id>/deliverables/<deliverable>/activities', methods=['PUT'])
def update_activity(bid_id, deliverable):
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

        return jsonify({"success": True, "message": "Activity updated successfully."}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/')
def home():
    return jsonify({"message": "Backend is running successfully!"}), 200

@app.route('/chatbot', methods=['POST'])
def chatbot():
    """
    Handle chatbot queries and provide dynamic responses with:
    - Additional step-by-step assignments for owners, dates, and status.
    - Suggestions for clickable pre-populated options.
    """
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

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)