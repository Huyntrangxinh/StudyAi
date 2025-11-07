export const renderMessage = (message: string): string => {
    let html = message;

    // 1. Replace bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');

    // 2. Replace headings
    html = html.replace(/### (.*?)(?=\n|$)/g, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>');
    html = html.replace(/## (.*?)(?=\n|$)/g, '<h2 class="text-xl font-bold text-gray-900 mt-4 mb-3">$1</h2>');

    // 3. Handle list items
    html = html.replace(/^(\s*)([•\-*])\s(.*?)(?=\n|$)/gm, '$1<li class="ml-4">$3</li>');

    // 4. Wrap consecutive list items in <ul> tags
    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, '<ul class="list-disc pl-5">$&</ul>');
    html = html.replace(/<ul>\s*<\/ul>/g, '');

    // 5. Handle paragraphs and line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/(?<!<\/p>)\n(?!<p>|<li>|<h)/g, '<br>');

    return `<div class="space-y-2">${html}</div>`;
};

