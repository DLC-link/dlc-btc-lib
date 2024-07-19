export async function sendRequest(url: string, body: string): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Response ${url} was not OK: ${response.statusText}`);
  }
}
