function filterMentions(text: string): string[] {
	const regex = /@[0-9]{11,13}/g;
	const matches = text.match(regex);
	if (matches) {
		return matches.map((number) => number.replace("@", "") + "@s.whatsapp.net");
	}
	return [];
}

export function normalizeTextMentions(text: string): { text: string; mentions: string[] } {
	const regex = /[0-9]{11,13}@s\.whatsapp\.net/;
	while (regex.test(text)) {
		text = text.replace(regex, "@" + text.match(regex)![0].replace(/@s\.whatsapp\.net/, ""));
	}
	return {
		text: text,
		mentions: filterMentions(text),
	};
}
