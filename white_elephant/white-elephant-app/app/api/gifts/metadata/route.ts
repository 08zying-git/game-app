import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 });
    }

    const html = await response.text();

    // Extract Open Graph metadata
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    
    // Fallback to regular meta tags
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const metaDescriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

    const metadata = {
      title: ogTitleMatch?.[1] || titleMatch?.[1] || null,
      description: ogDescriptionMatch?.[1] || metaDescriptionMatch?.[1] || null,
      imageUrl: ogImageMatch?.[1] || null,
    };

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Failed to extract metadata' },
      { status: 500 }
    );
  }
}


