import requests

def fetch_logo(client_name, output_path):
    logo_url = f"https://logo.clearbit.com/{client_name.lower().replace(' ', '')}.com"

    try:
        response = requests.get(logo_url, stream=True)
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
        else:
            print(f"Could not fetch logo for {client_name}")
    except Exception as e:
        print(f"Error fetching logo: {e}")