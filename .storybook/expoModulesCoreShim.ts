export class CodedError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function registerWebModule() {}

export const Platform = {
  OS: "web",
  select: (obj: any) => obj.web ?? obj.default,
};

export class UnavailabilityError extends Error {
  constructor(moduleName: string, propertyName: string) {
    super(`The method ${propertyName} on ${moduleName} is not available on web.`);
  }
}

export const uuid = {
  v4: () => "mock-uuid-" + Math.random().toString(36).substring(2, 9),
};

export class EventEmitter {
  addListener() {
    return { remove: () => {} };
  }
  emit() {}
}

export class NativeModule {}
export class SharedObject {}
export class SharedRef {}
