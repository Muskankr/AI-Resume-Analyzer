(() => {
  // Scraper selectors
  const selectors = {
    linkedin: {
      role: [
        ".job-details-jobs-unified-top-card__job-title",
        ".jobs-unified-top-card__job-title",
        "h1.t-24",
        "h1"
      ],
      description: [
        "#job-details",
        ".jobs-description-content__text",
        ".jobs-description__content",
        ".jobs-box__html-content"
      ]
    },
    indeed: {
      role: [
        ".jobsearch-JobInfoHeader-title",
        "h1.jobsearch-JobInfoHeader-title",
        "h1"
      ],
      description: [
        "#jobDescriptionText",
        ".jobsearch-jobDescriptionText"
      ]
    }
  };

  const getElementText = (selectorList) => {
    for (const selector of selectorList) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim()) {
        return el.innerText.trim();
      }
    }
    return "";
  };

  const host = window.location.hostname.toLowerCase();
  let role = "";
  let job_description = "";

  if (host.includes("linkedin.com")) {
    role = getElementText(selectors.linkedin.role);
    job_description = getElementText(selectors.linkedin.description);
  } else if (host.includes("indeed.com")) {
    role = getElementText(selectors.indeed.role);
    job_description = getElementText(selectors.indeed.description);
  }

  // Fallbacks
  if (!role) {
    // Attempt general heading
    const mainHeading = document.querySelector("h1");
    role = mainHeading ? mainHeading.innerText.trim() : document.title.split("-")[0].trim();
  }

  if (!job_description) {
    // Attempt to grab selected text
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      job_description = selectedText;
    } else {
      // Fallback to body text or article content
      const article = document.querySelector("article");
      job_description = article ? article.innerText.trim() : document.body.innerText.trim();
    }
  }

  return {
    role: role || "Frontend Developer",
    job_description: job_description || ""
  };
})();
