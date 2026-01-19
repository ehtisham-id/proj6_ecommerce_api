describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: AuditLoggerService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should create user', async () => {
    const dto = { email: 'test@example.com', password: 'pass123', firstName: 'Test', lastName: 'User' };
    jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
    jest.spyOn(userRepository, 'create').mockReturnValue({ id: 'uuid', ...dto } as User);
    jest.spyOn(userRepository, 'save').mockResolvedValue({ id: 'uuid', ...dto } as User);

    const result = await service.create(dto);
    expect(result.email).toBe(dto.email);
  });
});
