import React from 'react';

export interface MarkdownElement {
  type: 'text' | 'link' | 'bold';
  content: string;
  url?: string;
}

/**
 * Parses a text string and converts markdown links and bold text to JSX elements
 * Defensively handles malformed markdown
 */
export function parseMarkdownToJSX(text: string): React.ReactNode[] {
  if (!text || typeof text !== 'string') {
    return [text];
  }

  const elements: React.ReactNode[] = [];
  let currentIndex = 0;

  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  // Regex to match bold text: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;

  // Combine both regexes to find all matches
  const allMatches: Array<{
    index: number;
    length: number;
    type: 'link' | 'bold';
    text: string;
    url?: string;
  }> = [];

  // Find all link matches
  let linkMatch;
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    allMatches.push({
      index: linkMatch.index,
      length: linkMatch[0].length,
      type: 'link',
      text: linkMatch[1],
      url: linkMatch[2]
    });
  }

  // Find all bold matches
  let boldMatch;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    allMatches.push({
      index: boldMatch.index,
      length: boldMatch[0].length,
      type: 'bold',
      text: boldMatch[1]
    });
  }

  // Sort matches by index
  allMatches.sort((a, b) => a.index - b.index);

  // Generate unique base ID for this parsing session
  const uniqueId = Math.random().toString(36).substr(2, 9);
  
  // Process matches and build JSX elements
  allMatches.forEach((match, matchIndex) => {
    // Add text before this match
    if (match.index > currentIndex) {
      const beforeText = text.slice(currentIndex, match.index);
      if (beforeText) {
        elements.push(beforeText);
      }
    }

    // Add the matched element with unique keys
    if (match.type === 'link' && match.url) {
      elements.push(
        <a
          key={`link-${uniqueId}-${matchIndex}`}
          href={match.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline hover:no-underline transition-colors"
        >
          {match.text}
        </a>
      );
    } else if (match.type === 'bold') {
      elements.push(
        <strong key={`bold-${uniqueId}-${matchIndex}`} className="font-semibold">
          {match.text}
        </strong>
      );
    }

    currentIndex = match.index + match.length;
  });

  // Add any remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      elements.push(remainingText);
    }
  }

  // If no matches found, return original text
  if (elements.length === 0) {
    return [text];
  }

  return elements;
}

/**
 * Processes text content and preserves line breaks while parsing markdown
 */
export function processMessageContent(content: string): React.ReactNode[] {
  if (!content || typeof content !== 'string') {
    return [content];
  }

  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  const uniqueContentId = Math.random().toString(36).substr(2, 9);

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      result.push(<br key={`br-${uniqueContentId}-${lineIndex}`} />);
    }
    
    const parsedLine = parseMarkdownToJSX(line);
    result.push(...parsedLine);
  });

  return result;
}