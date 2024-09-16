let uploadedImageUrl;

function isValidImageUrl(input) {
    return /^https?:\/\/[^/]+\/.*\.(jpeg|jpg|png|gif)$/i.test(input);
}

async function recognizeCar() {
    let imageUrl = document.getElementById('image-url').value;

    if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
    }

    if (!isValidImageUrl(imageUrl)) {
        return displayError("Please enter a valid image URL or upload an image.");
    }

    document.getElementById('image-recognize-button').disabled = true;

    try {
        const response = await axios.post('/api/recognize', { imageUrl });
        displayResults(response.data);
    } catch (error) {
        console.error(error);
        displayError("Error occurred during recognition!");
    } finally {
        document.getElementById('image-recognize-button').disabled = false;
        uploadedImageUrl = null;
    }
}

async function handleUpload() {
    const fileInput = document.getElementById('image-file');
    const file = fileInput.files[0];

    if (!file) {
        return displayError("Please select a file.");
    }

    document.getElementById('image-upload-button').disabled = true;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await axios.post('/api/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        uploadedImageUrl = response.data.imageUrl;
        displayError("File uploaded successfully. Click \"Recognize Car\" to proceed.");
    } catch (error) {
        console.error(error);
        displayError("Error occurred during upload!");
    } finally {
        document.getElementById('image-upload-button').disabled = false;
    }
}

function displayResults(carData) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    for(const key in carData) {
        const value = carData[key];
        const p = document.createElement('p');
        p.textContent = `${key}: ${value}`;
        resultsDiv.appendChild(p);
    }
}

function displayError(message) {
    document.getElementById('results').innerText = message;
}
