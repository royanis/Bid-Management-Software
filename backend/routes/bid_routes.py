from flask import Blueprint, request, jsonify
from controllers.bid_controller import create_bid, list_bids, get_bid, get_activities, save_activities

# Initialize Blueprint
bid_routes = Blueprint('bid_routes', __name__)

# Helper function for consistent error responses
def create_error_response(message, status_code=500):
    return jsonify({'success': False, 'message': message}), status_code

# Route: Create a new bid
@bid_routes.route('/create', methods=['OPTIONS', 'POST'])
def create_bid_route():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response, 200

    # Handle POST request
    try:
        data = request.json
        if not data:
            return create_error_response("Request body is missing", 400)

        response = create_bid(data)
        return jsonify(response), response.get('status', 200)
    except Exception as e:
        return create_error_response(f"Error: {str(e)}")

# Route: List all bids
@bid_routes.route('/list', methods=['OPTIONS', 'GET'])
def list_bids_route():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        return response, 200

    # Handle GET request
    try:
        response = list_bids()
        return jsonify(response), response.get('status', 200)
    except Exception as e:
        return create_error_response(f"Error: {str(e)}")

# Route: Get a specific bid by name
@bid_routes.route('/<string:bid_name>', methods=['OPTIONS', 'GET'])
def get_bid_route(bid_name):
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        return response, 200

    # Handle GET request
    try:
        if not bid_name:
            return create_error_response("Bid name is required", 400)

        response = get_bid(bid_name)
        return jsonify(response), response.get('status', 200)
    except Exception as e:
        return create_error_response(f"Error: {str(e)}")

# Route: Manage activities for a deliverable
@bid_routes.route('/<string:bid_name>/deliverables/<string:deliverable_name>/activities', methods=['OPTIONS', 'POST', 'GET'])
def manage_activities(bid_name, deliverable_name):
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response, 200

    try:
        if request.method == 'GET':
            # Logic to fetch activities for the deliverable
            activities = get_activities(bid_name, deliverable_name)
            return jsonify({'success': True, 'activities': activities}), 200

        if request.method == 'POST':
            # Logic to save activities for the deliverable
            data = request.json
            if not data:
                return create_error_response("Request body is missing", 400)
            save_activities(bid_name, deliverable_name, data)
            return jsonify({'success': True, 'message': 'Activities updated successfully'}), 200

    except Exception as e:
        return create_error_response(f"Error: {str(e)}")