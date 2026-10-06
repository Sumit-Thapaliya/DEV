export class RequiredError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'RequiredError';
    this.statusCode = 400; // Bad Request
  }
}