export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const backendUrl = process.env.VITE_BACKEND_URL || 'https://ai-resume-analyzer-backend.onrender.com';
    const apiRes = await fetch(`${backendUrl}/api/shared/${id}/`); 
    let data = null;
    if (apiRes.ok) {
      data = await apiRes.json();
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;

    const htmlRes = await fetch(`${protocol}://${host}/`);
    let html = await htmlRes.text();

    if (data && data.score !== undefined) {
      const targetRole = data.target_role || 'Not specified';
      const dynamicTitle = `Score: ${data.score}% — AI Resume Analyzer`;
      const dynamicDesc = `Target Role: ${targetRole}. View the full ATS analysis!`;

      
      html = html.replace(
        /<title>.*?<\/title>/i,
        `<title>${dynamicTitle}</title>`
      );

      html = html.replace(
        /<meta\s+name="title"\s+content=".*?"\s*\/?>/i,
        `<meta name="title" content="${dynamicTitle}" />`
      );
      html = html.replace(
        /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
        `<meta name="description" content="${dynamicDesc}" />`
      );

     
      html = html.replace(
        /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
        `<meta property="og:title" content="${dynamicTitle}" />`
      );
      html = html.replace(
        /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
        `<meta property="og:description" content="${dynamicDesc}" />`
      );

     
      html = html.replace(
        /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i,
        `<meta name="twitter:title" content="${dynamicTitle}" />`
      );
      html = html.replace(
        /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i,
        `<meta name="twitter:description" content="${dynamicDesc}" />`
      );
    }

    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error generating dynamic OG tags:', error);
    
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const fallbackHtmlRes = await fetch(`${protocol}://${host}/`);
      const fallbackHtml = await fallbackHtmlRes.text();
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(fallbackHtml);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  }
}
