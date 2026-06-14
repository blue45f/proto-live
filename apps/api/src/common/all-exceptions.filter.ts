import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Logger as PinoLogger } from 'nestjs-pino'

import type { ExceptionFilter } from '@nestjs/common'
import type { Request, Response } from 'express'

/**
 * 글로벌 예외 필터.
 *
 * 모든 unhandled 예외를 잡아 일관된 JSON envelope 로 응답한다.
 *
 * **역호환 원칙(중요):** NestJS 기본 에러 형태를 절대 깨뜨리지 않는다.
 * - `HttpException` 이면 `getResponse()` 의 결과를 그대로 보존한다.
 *   - 문자열이면 `{ statusCode, message }` 로 감싼다(기본 NestJS 와 동일).
 *   - 객체면 그 객체를 펼쳐 `statusCode`/`message`/`error` 를 그대로 유지한다
 *     (예: ZodValidationPipe 가 만드는 `{ statusCode, message: string[], error }`).
 * - 그 위에 `path`·`timestamp` 만 ADD 한다.
 *
 * 프론트엔드의 `getApiErrorMessage` 가 읽는 `data.message`(string | string[]) 와
 * `statusCode` 는 어떤 경우에도 제거·변형되지 않는다.
 *
 * 5xx 응답은 logger(pino 우선, 없으면 Nest Logger)로 error 레벨 로깅한다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly fallbackLogger = new Logger(AllExceptionsFilter.name)

  // nestjs-pino Logger 는 DI 로 주입된다. 부팅 초기 등 미주입 상황에서도
  // 안전하도록 Optional 하게 다루고, 없으면 Nest 기본 Logger 로 폴백한다.
  constructor(private readonly pinoLogger?: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const isHttpException = exception instanceof HttpException
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    // 기존 NestJS 기본 필드(statusCode/message/error)를 보존한다.
    const baseBody = this.buildBaseBody(exception, isHttpException, status)

    // path·timestamp 만 ADD — 기존 필드는 그대로 둔다.
    const body = {
      ...baseBody,
      path: request?.url ?? '',
      timestamp: new Date().toISOString(),
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logServerError(exception, request)
    }

    response.status(status).json(body)
  }

  /**
   * NestJS 기본 에러 형태를 보존하는 기본 envelope 를 만든다.
   * 최소 `statusCode`(number)와 `message` 를 항상 포함한다.
   */
  private buildBaseBody(
    exception: unknown,
    isHttpException: boolean,
    status: number
  ): Record<string, unknown> {
    if (isHttpException) {
      const httpResponse = (exception as HttpException).getResponse()

      // getResponse() 가 객체면 그 객체를 펼쳐 statusCode/message/error 를 유지한다.
      if (typeof httpResponse === 'object' && httpResponse !== null) {
        const objectBody = httpResponse as Record<string, unknown>
        return {
          // statusCode 가 누락된 경우만 보강한다(기존 값은 절대 덮어쓰지 않음).
          statusCode: objectBody.statusCode ?? status,
          ...objectBody,
        }
      }

      // 문자열이면 기본 NestJS 와 동일하게 { statusCode, message } 로 감싼다.
      return { statusCode: status, message: httpResponse }
    }

    // HttpException 이 아닌 경우(예기치 못한 5xx)는 내부 메시지를 노출하지 않는다.
    return { statusCode: status, message: 'Internal server error' }
  }

  private logServerError(exception: unknown, request: Request | undefined): void {
    const method = request?.method ?? ''
    const url = request?.url ?? ''
    const context = `${method} ${url}`.trim()
    const stack = exception instanceof Error ? exception.stack : undefined
    const messageText = exception instanceof Error ? exception.message : 'Unknown error'
    const message = `Unhandled exception on ${context}: ${messageText}`

    if (this.pinoLogger) {
      this.pinoLogger.error({ err: exception, req: { method, url } }, message)
      return
    }

    this.fallbackLogger.error(message, stack)
  }
}
