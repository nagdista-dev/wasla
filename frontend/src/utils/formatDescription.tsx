function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatTimestamp(timestamp: string): string {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}:${parts[2].toString().padStart(2, '0')}`;
  } else if (parts.length === 2) {
    return `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}`;
  }
  return timestamp;
}

export function formatDescription(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /(https?:\/\/[^\s<]*[^\s<.,;:!?)\]}>'"`]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-coral hover:underline break-all">$1</a>'
    )
    .replace(
      /(^|\s)(#[a-zA-Z0-9_\u0600-\u06FF]+)/g,
      '$1<span class="text-brand-pink hover:text-brand-coral transition-colors cursor-default">$2</span>'
    )
    .replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<a href="mailto:$1" class="text-brand-purple hover:text-brand-coral transition-colors underline">$1</a>'
    )
    .replace(
      /(^|\s)@([a-zA-Z0-9_.-]+)/g,
      '$1<a href="https://www.youtube.com/@$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 dark:text-blue-400 hover:text-brand-coral transition-colors font-medium">@$2</a>'
    )
    .replace(
      /(^|\n)([\-\=]{3,})($|\n)/g,
      '$1<hr class="border-gray-200 dark:border-white/10 my-2" />$3'
    )
    .replace(
      /(^|\n)(-\s.+?)(?=\n|$)/g,
      '<li class="flex items-start gap-2 mb-2 text-gray-700 dark:text-gray-300">• $1</li>'
    )
    .replace(
      /(^|\n)(\d+\.\s.+?)(?=\n|$)/g,
      '<li class="flex items-start gap-2 mb-2 text-gray-700 dark:text-gray-300"><span class="font-semibold text-brand-coral">$1</span></li>'
    )
    .replace(/\n/g, '<br/>')
    .replace(
      /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g,
      (match) => {
        const seconds = timestampToSeconds(match);
        return `<span class="timestamp-highlight cursor-pointer font-mono text-brand-coral hover:text-brand-pink transition-colors" data-seconds="${seconds}">${formatTimestamp(match)}</span>`;
      }
    );
}

export { timestampToSeconds, formatTimestamp };
