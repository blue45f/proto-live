import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common'

import { AllExceptionsFilter } from '../src/common/all-exceptions.filter'

import type { ArgumentsHost } from '@nestjs/common'

interface CapturedResponse {
  statusCode?: number
  body?: Record<string, unknown>
}

/**
 * 최소한의 ArgumentsHost mock — switchToHttp().getResponse()/getRequest() 만 제공.
 * Express Response 의 status().json() 체인을 흉내내 응답 본문을 캡처한다.
 */
function makeHost(request: { url?: string; method?: string }): {
  host: ArgumentsHost
  captured: CapturedResponse
} {
  const captured: CapturedResponse = {}
  const response = {
    status(code: number) {
      captured.statusCode = code
      return this
    },
    json(payload: Record<string, unknown>) {
      captured.body = payload
      return this
    },
  }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost
  return { host, captured }
}

test('HttpException(객체 응답): statusCode/message/error 보존 + path·timestamp ADD', () => {
  const filter = new AllExceptionsFilter()
  const { host, captured } = makeHost({ url: '/api/projects', method: 'POST' })

  // ZodValidationPipe 가 만드는 형태: { statusCode, message: string[], error }
  filter.catch(new BadRequestException(['title is required', 'url is invalid']), host)

  assert.equal(captured.statusCode, 400)
  const body = captured.body!
  // 역호환: 프론트가 읽는 statusCode + message(배열) 그대로 유지
  assert.equal(body.statusCode, 400)
  assert.deepEqual(body.message, ['title is required', 'url is invalid'])
  assert.equal(body.error, 'Bad Request')
  // 추가 필드만 ADD
  assert.equal(body.path, '/api/projects')
  assert.equal(typeof body.timestamp, 'string')
})

test('HttpException(문자열 응답): { statusCode, message } 로 감싸고 path·timestamp ADD', () => {
  const filter = new AllExceptionsFilter()
  const { host, captured } = makeHost({ url: '/api/secret', method: 'GET' })

  filter.catch(new HttpException('Forbidden resource', HttpStatus.FORBIDDEN), host)

  assert.equal(captured.statusCode, 403)
  const body = captured.body!
  assert.equal(body.statusCode, 403)
  assert.equal(body.message, 'Forbidden resource')
  assert.equal(body.path, '/api/secret')
  assert.equal(typeof body.timestamp, 'string')
})

test('비-HttpException: 500 + 내부 메시지 비노출, statusCode/message 유지', () => {
  // pino logger 미주입 시 Nest 기본 Logger 폴백 — 로깅이 throw 하지 않음을 검증.
  const filter = new AllExceptionsFilter()
  const { host, captured } = makeHost({ url: '/api/boom', method: 'GET' })

  filter.catch(new Error('database connection string leaked!'), host)

  assert.equal(captured.statusCode, 500)
  const body = captured.body!
  assert.equal(body.statusCode, 500)
  // 내부 에러 메시지는 노출하지 않는다.
  assert.equal(body.message, 'Internal server error')
  assert.equal(body.path, '/api/boom')
  assert.equal(typeof body.timestamp, 'string')
})

test('statusCode 가 누락된 객체 응답이면 status 로 보강한다', () => {
  const filter = new AllExceptionsFilter()
  const { host, captured } = makeHost({ url: '/api/custom', method: 'GET' })

  // statusCode 없이 message 만 있는 커스텀 객체 본문
  filter.catch(new HttpException({ message: 'custom' }, HttpStatus.CONFLICT), host)

  assert.equal(captured.statusCode, 409)
  const body = captured.body!
  assert.equal(body.statusCode, 409)
  assert.equal(body.message, 'custom')
})
