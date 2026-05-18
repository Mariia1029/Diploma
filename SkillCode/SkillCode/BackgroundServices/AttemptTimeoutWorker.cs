using SkillCode.Interfaces;

namespace SkillCode.BackgroundServices;

public class AttemptTimeoutWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AttemptTimeoutWorker> _logger;

    public AttemptTimeoutWorker(IServiceScopeFactory scopeFactory, ILogger<AttemptTimeoutWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(30), ct);

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IAttemptService>();
                await service.ForceFinishExpiredAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while force-finishing expired attempts");
            }
        }
    }
}
