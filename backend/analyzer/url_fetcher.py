import os
import re
import uuid
import requests
from django.conf import settings


def convert_to_direct_download_url(url: str) -> tuple[str, str]:
    """
    Converts shareable Google Drive, Dropbox, or direct URLs into direct download links.
    Returns a tuple of (direct_download_url, suggested_filename).
    """
    url = url.strip()

    # Google Drive patterns
    gdrive_match = re.search(r'(?:file/d/|open\?id=|document/d/)([a-zA-Z0-9_-]+)', url)
    if gdrive_match:
        file_id = gdrive_match.group(1)
        direct_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        return direct_url, f"gdrive_{file_id}.pdf"

    # Dropbox patterns
    if "dropbox.com" in url.lower():
        if "?dl=0" in url or "&dl=0" in url:
            direct_url = url.replace("dl=0", "dl=1")
        elif "raw=1" not in url and "dl=1" not in url:
            sep = "&" if "?" in url else "?"
            direct_url = f"{url}{sep}dl=1"
        else:
            direct_url = url
        path_filename = os.path.basename(url.split("?")[0])
        filename = path_filename if path_filename else "dropbox_resume.pdf"
        return direct_url, filename

    # Default direct URL
    path_filename = os.path.basename(url.split("?")[0])
    filename = path_filename if path_filename.endswith(".pdf") else "imported_resume.pdf"
    return url, filename


def download_and_validate_url(url: str, max_size_mb: int = 10) -> tuple[str, str]:
    """
    Downloads a resume from a URL, validates accessibility, size, and format.
    Returns (saved_file_path, file_name).
    Raises ValueError with user-friendly error message on failure.
    """
    if not url or not url.strip().startswith(("http://", "https://")):
        raise ValueError("Please provide a valid URL starting with http:// or https://")

    direct_url, suggested_name = convert_to_direct_download_url(url)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/115.0.0.0 Safari/537.36"
        )
    }

    try:
        response = requests.get(direct_url, stream=True, timeout=15, headers=headers)
    except requests.exceptions.Timeout:
        raise ValueError("The request timed out while trying to fetch the file. Please check the URL and try again.")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Failed to connect to the provided URL: {str(e)}")

    if response.status_code in (401, 403):
        raise ValueError("The provided link is private or inaccessible. Please ensure share permissions are set to 'Anyone with the link can view'.")
    elif response.status_code == 404:
        raise ValueError("File not found at the provided URL (404). Please check the link and try again.")
    elif response.status_code != 200:
        raise ValueError(f"Could not download file from URL (HTTP Status {response.status_code}).")

    # Check Content-Length if available
    content_length = response.headers.get("Content-Length")
    if content_length and content_length.isdigit():
        size_bytes = int(content_length)
        if size_bytes > max_size_mb * 1024 * 1024:
            raise ValueError(f"The file exceeds the maximum allowed size of {max_size_mb}MB.")

    temp_dir = os.path.join(settings.BASE_DIR, "tmp")
    os.makedirs(temp_dir, exist_ok=True)
    saved_filename = f"{uuid.uuid4()}_{suggested_name}"
    file_path = os.path.join(temp_dir, saved_filename)

    downloaded_size = 0
    first_chunk = None

    with open(file_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if not first_chunk and chunk:
                first_chunk = chunk
            downloaded_size += len(chunk)
            if downloaded_size > max_size_mb * 1024 * 1024:
                f.close()
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise ValueError(f"The file exceeds the maximum allowed size of {max_size_mb}MB.")
            f.write(chunk)

    # Validate file content is not an HTML login/error page
    if first_chunk:
        lower_chunk = first_chunk[:500].lower()
        if b"<!doctype html" in lower_chunk or b"<html" in lower_chunk:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise ValueError("The provided URL returned a web page instead of a document file. Please ensure the link is a direct share link with public access.")

    return file_path, suggested_name
