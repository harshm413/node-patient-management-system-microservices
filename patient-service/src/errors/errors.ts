export class EmailAlreadyExistsException extends Error {
  constructor(message: string = 'Email address already exists') {
    super(message);
    this.name = 'EmailAlreadyExistsException';
  }
}

export class PatientNotFoundException extends Error {
  constructor(message: string = 'Patient not found') {
    super(message);
    this.name = 'PatientNotFoundException';
  }
}
