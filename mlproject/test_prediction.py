import requests
import os

# Testing on a Cancer image
# base_path below is not defined in the snippets but I'll iterate or just use relative path
image_path = os.path.join(os.getcwd(), "mlproject", "datasets", "Oral_Cancer", "001.jpeg") 

url = 'http://localhost:5000/predict'

def test_single_image(path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    print(f"Testing image: {path}")
    with open(path, 'rb') as f:
        files = {'file': f}
        r = requests.post(url, files=files)
    
    print("Status:", r.status_code)
    try:
        data = r.json()
        if 'gradCamImage' in data:
            del data['gradCamImage']
        print("Response:", data)
        import json
        with open("prediction_result.json", "w") as f:
            json.dump(data, f, indent=4)
    except:
        print("Raw text:", r.text)

if __name__ == "__main__":
    test_single_image(image_path)
