export function createMockResponse() {
  const res: any = {};
  res.statusCode = 200;
  res.body = undefined;
  res.headers = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  res.send = (body?: unknown) => {
    res.body = body;
    return res;
  };
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
    return res;
  };
  return res;
}
