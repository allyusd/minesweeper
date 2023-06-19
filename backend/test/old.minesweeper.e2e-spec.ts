import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { NestFactory } from '@nestjs/core';
import * as WebSocket from 'ws';
import { AppModule } from '../src/app.module';
import { WinLoseState } from '../src/minesweeper/gameState';
import { Cell, CellState } from '../src/minesweeper/cell';
import { randomUUID } from 'crypto';
import { MinesweeperData } from '../src/data-services/data/minesweeper.data';
import { LevelConfig } from '../src/minesweeper/levelConfig';
import { Minesweeper } from '../src/minesweeper/minesweeper';
import { WsGateway } from '../src/app.gateway';

describe('WebSocket Gateway', () => {
  let app: INestApplication;
  let ws: WebSocket;

  // TODO 之後要把 Repository 移到其它地方
  let wsGateway: WsGateway;

  // beforeAll((done) => {
  //   NestFactory.create(AppModule).then((a) => {
  //     app = a;
  //     a.useWebSocketAdapter(new WsAdapter(a));
  //     a.listen(3000, done());
  //   });
  // });

  beforeAll(async () => {
    app = await NestFactory.create(AppModule);
    app.useWebSocketAdapter(new WsAdapter(app));
    app.enableShutdownHooks();

    wsGateway = app.get(WsGateway);

    await app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  // beforeEach(() => {});

  afterEach((done) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.on('close', () => done());
      ws.close();
    } else {
      done();
    }
  });

  const sendData = (event: string, eventData: object) => {
    const data = JSON.stringify({
      event: event,
      data: JSON.stringify(eventData),
    });
    ws.send(data);
  };

  const ping = () => {
    sendData('ping', {});
  };

  const gameInfo = (gameId: string = undefined) => {
    sendData('gameInfo', { gameId });
  };

  const open = (gameId: string, x: number, y: number) => {
    const data = {
      gameId,
      x,
      y,
    };

    sendData('open', data);
  };

  const flag = (gameId: string, x: number, y: number) => {
    const data = {
      gameId,
      x,
      y,
    };

    sendData('flag', data);
  };

  // 基本 websocket ping pong
  it('ping pong', (done) => {
    ws = new WebSocket('ws://localhost:3000');

    ws.on('open', () => {
      ping();
    });

    ws.on('message', (message) => {
      const event = JSON.parse(message.toString());
      expect(event.event).toBe('pong');
      done();
    });
  });

  // 基本遊戲狀態
  it('when game start then gameState should be NONE', (done) => {
    ws = new WebSocket('ws://localhost:3000');

    ws.on('open', () => {
      gameInfo();
    });

    ws.on('message', (message) => {
      const event = JSON.parse(message.toString());
      // expect(event.event).toBe("gameInfo");

      switch (event.event) {
        case 'gameInfo':
          expect(event.data.gameState.winLose).toBe(WinLoseState.NONE);
          done();
          break;
        default:
          break;
      }
    });
  });

  it('只能踩還沒有踩過且沒有插旗的格子 - 這個位置還沒踩過且沒有插旗', (done) => {
    ws = new WebSocket('ws://localhost:3000');

    ws.on('open', () => {
      gameInfo();
    });

    let gameInfoCount = 0;
    ws.on('message', (message) => {
      const event = JSON.parse(message.toString());

      switch (event.event) {
        case 'gameInfo':
          gameInfoCount++;
          switch (gameInfoCount) {
            case 1:
              // given
              // 這個位置還沒踩過且沒有插旗
              // console.log(`gameInfo: ${gameInfoCount}`);
              // console.log(event.data);
              // console.log(event.data.cells[0][0].state === CellState.UNOPENED);
              expect(event.data.cells[0][0].state).toBe(CellState.UNOPENED);

              // when
              // 玩家踩地雷
              open(event.data.gameId, 0, 0);
              break;
            case 2:
              // then
              // 這一格被踩過
              expect(event.data.cells[0][0].state).toBe(CellState.OPENED);
              done();
              break;
            default:
              throw new Error(`unhandled case`);
          }
          break;
        default:
          throw new Error(`unhandled case`);
      }
    });
  });

  it('只能踩還沒有踩過且沒有插旗的格子 - 這個位置已經被踩過', (done) => {
    ws = new WebSocket('ws://localhost:3000');

    ws.on('open', () => {
      gameInfo();
    });

    let gameInfoCount = 0;
    ws.on('message', (message) => {
      const event = JSON.parse(message.toString());

      switch (event.event) {
        case 'gameInfo':
          gameInfoCount++;
          switch (gameInfoCount) {
            case 1:
              expect(event.data.cells[0][0].state).toBe(CellState.UNOPENED);
              open(event.data.gameId, 0, 0);
              break;
            case 2:
              // given
              // 這個位置已經被踩過
              expect(event.data.cells[0][0].state).toBe(CellState.OPENED);

              // when
              // 玩家踩地雷
              open(event.data.gameId, 0, 0);
              break;
            case 3:
              // then
              // 沒有變化
              expect(event.data.cells[0][0].state).toBe(CellState.OPENED);
              done();
              break;
            default:
              throw new Error(`unhandled case`);
          }
          break;
        default:
          throw new Error(`unhandled case`);
      }
    });
  });

  it('只能踩還沒有踩過且沒有插旗的格子 - 這個位置已經被插旗', (done) => {
    ws = new WebSocket('ws://localhost:3000');

    ws.on('open', () => {
      gameInfo();
    });

    let gameInfoCount = 0;
    ws.on('message', (message) => {
      const event = JSON.parse(message.toString());

      switch (event.event) {
        case 'gameInfo':
          gameInfoCount++;
          switch (gameInfoCount) {
            case 1:
              expect(event.data.cells[0][0].state).toBe(CellState.UNOPENED);
              flag(event.data.gameId, 0, 0);
              break;
            case 2:
              // given
              // 這個位置已經被插旗
              expect(event.data.cells[0][0].state).toBe(CellState.FLAGGED);

              // when
              // 玩家踩地雷
              open(event.data.gameId, 0, 0);
              break;
            case 3:
              // then
              // 沒有變化
              expect(event.data.cells[0][0].state).toBe(CellState.FLAGGED);
              done();
              break;
            default:
              throw new Error(`unhandled case`);
          }
          break;
        default:
          throw new Error(`unhandled case`);
      }
    });
  });

  const generateCells = (levelConfig: LevelConfig): Cell[][] => {
    const cells = [];
    for (let y = 0; y < levelConfig.size.y; y++) {
      cells[y] = [];
      for (let x = 0; x < levelConfig.size.x; x++) {
        cells[y][x] = new Cell(x, y);
      }
    }
    return cells;
  };

  /**
   * 3 x 3，只有 1 個地雷，要自己設定地雷位置
   */
  const initData = (): MinesweeperData => {
    const levelConfig = {
      size: {
        x: 3,
        y: 3,
      },
      mineCount: 1,
    };

    const data: MinesweeperData = {
      gameId: randomUUID(),
      gameState: {
        isPlay: true,
        winLose: WinLoseState.NONE,
        displayMineCount: levelConfig.mineCount,
      },
      board: {
        cells: generateCells(levelConfig),
        unopenedCells:
          levelConfig.size.x * levelConfig.size.y - levelConfig.mineCount,
        flagCount: 0,
      },
      levelConfig,
    };

    return data;
  };

  it('踩到地雷遊戲結束', (done) => {
    // Given
    const data = initData();

    // 在 0, 0 放地雷
    data.board.cells[0][0].mine = true;

    const domain: Minesweeper = wsGateway.minesweeperDataModel.toDomain(data);
    wsGateway.minesweeperRepository
      .save(domain)
      .then(() => {
        ws = new WebSocket('ws://localhost:3000');

        ws.on('open', () => {
          gameInfo(domain.gameId);
        });

        let gameInfoCount = 0;
        ws.on('message', (message) => {
          const event = JSON.parse(message.toString());

          switch (event.event) {
            case 'gameInfo':
              gameInfoCount++;
              switch (gameInfoCount) {
                case 1:
                  expect(event.data.gameState.winLose).toBe(WinLoseState.NONE);
                  // When
                  // 玩家踩地雷
                  open(event.data.gameId, 0, 0);
                  break;
                case 2:
                  // Then
                  // 遊戲結束
                  expect(event.data.gameState.winLose).toBe(WinLoseState.LOSE);
                  done();
                  break;
                default:
                  throw new Error(`unhandled case`);
              }
              break;
            default:
              throw new Error(`unhandled case`);
          }
        });
      })
      .catch((err) => {
        throw err;
      });
  });

  it('沒踩到地雷會知道附近有多少地雷', (done) => {
    // Given
    const data = initData();

    // 在 0, 0 放地雷
    data.board.cells[0][1].mine = true;
    data.board.cells[0][0].number = 1;

    const domain: Minesweeper = wsGateway.minesweeperDataModel.toDomain(data);
    wsGateway.minesweeperRepository
      .save(domain)
      .then(() => {
        ws = new WebSocket('ws://localhost:3000');

        ws.on('open', () => {
          gameInfo(domain.gameId);
        });

        let gameInfoCount = 0;
        ws.on('message', (message) => {
          const event = JSON.parse(message.toString());

          switch (event.event) {
            case 'gameInfo':
              gameInfoCount++;
              switch (gameInfoCount) {
                case 1:
                  // When
                  // 玩家踩地雷
                  open(event.data.gameId, 0, 0);
                  break;
                case 2:
                  // Then
                  // 遊戲結束
                  expect(event.data.cells[0][0].number).toBe(1);
                  done();
                  break;
                default:
                  throw new Error(`unhandled case`);
              }
              break;
            default:
              throw new Error(`unhandled case`);
          }
        });
      })
      .catch((err) => {
        throw err;
      });
  });

  it('沒踩到地雷且附近也沒有地雷，自動踩附近的所有位置', (done) => {
    // Given
    const data = initData();

    // 在 2, 2 放地雷
    data.board.cells[2][2].mine = true;

    const domain: Minesweeper = wsGateway.minesweeperDataModel.toDomain(data);
    wsGateway.minesweeperRepository
      .save(domain)
      .then(() => {
        ws = new WebSocket('ws://localhost:3000');

        ws.on('open', () => {
          gameInfo(domain.gameId);
        });

        let gameInfoCount = 0;
        ws.on('message', (message) => {
          const event = JSON.parse(message.toString());

          switch (event.event) {
            case 'gameInfo':
              gameInfoCount++;
              switch (gameInfoCount) {
                case 1:
                  expect(event.data.cells[0][0].state).toBe(CellState.UNOPENED);
                  expect(event.data.cells[0][1].state).toBe(CellState.UNOPENED);
                  // When
                  // 玩家踩地雷
                  open(event.data.gameId, 0, 0);
                  break;
                case 2:
                  // Then
                  // 自動踩附近的所有位置
                  for (let y = 0; y < data.levelConfig.size.y; y++) {
                    for (let x = 0; x < data.levelConfig.size.x; x++) {
                      if (x !== 2 && y !== 2) {
                        expect(event.data.cells[y][x].state).toBe(
                          CellState.OPENED,
                        );
                      }
                    }
                  }
                  done();
                  break;
                default:
                  throw new Error(`unhandled case`);
              }
              break;
            default:
              throw new Error(`unhandled case`);
          }
        });
      })
      .catch((err) => {
        throw err;
      });
  });
});
