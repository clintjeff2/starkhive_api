import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { WalletAlreadyConnectedException } from './exceptions/wallet.exceptions';

describe('AuthController - Wallet Features', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'freelancer',
    walletAddress: null,
    walletConnectedAt: null,
  };

  const mockAuthService = {
    connectWallet: jest.fn(),
    getWalletInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('connectWallet', () => {
    it('should connect wallet successfully', async () => {
      const connectWalletDto: ConnectWalletDto = {
        walletAddress: '0x742d35Cc6634C0532925a3b8D5F4E8B8B6D8c4f3',
      };

      const expectedResult = {
        ...mockUser,
        walletAddress: connectWalletDto.walletAddress.toLowerCase(),
        walletConnectedAt: new Date(),
      };

      mockAuthService.connectWallet.mockResolvedValue(expectedResult);

      const req = { user: { id: 1 } };
      const result = await controller.connectWallet(req, connectWalletDto);

      expect(service.connectWallet).toHaveBeenCalledWith(1, connectWalletDto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error when wallet already connected', async () => {
      const connectWalletDto: ConnectWalletDto = {
        walletAddress: '0x742d35Cc6634C0532925a3b8D5F4E8B8B6D8c4f3',
      };

      mockAuthService.connectWallet.mockRejectedValue(
        new WalletAlreadyConnectedException(),
      );

      const req = { user: { id: 1 } };

      await expect(
        controller.connectWallet(req, connectWalletDto),
      ).rejects.toThrow(WalletAlreadyConnectedException);
    });
  });
});
