import { Share } from 'react-native';

export type ShareResponseCardInput = {
  response: string;
  tone: string;
  category: string;
  appUrl: string;
};

export async function shareResponseCard(input: ShareResponseCardInput): Promise<boolean> {
  const message = [
    'RizzCheck Share Card',
    `Tone: ${input.tone}`,
    `Context: ${input.category}`,
    '',
    `"${input.response}"`,
    '',
    `Try it: ${input.appUrl}`,
  ].join('\n');

  const result = await Share.share({
    message,
    url: input.appUrl,
  });

  return result.action === Share.sharedAction;
}

export async function shareAppInvite(appUrl: string): Promise<boolean> {
  const result = await Share.share({
    message:
      'Check out RizzCheck - AI texting assistant that helps you reply with confidence.\n' +
      appUrl,
    url: appUrl,
  });

  return result.action === Share.sharedAction;
}
