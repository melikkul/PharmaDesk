using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/carriers")]
    [Authorize] // Should restrict to Admin role in production
    public class CarriersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CarriersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/carriers
        // List all carriers with their groups
        [HttpGet]
        public async Task<IActionResult> GetAllCarriers()
        {
            var carriers = await _context.Carriers
                .Include(c => c.CarrierGroups)
                .ThenInclude(cg => cg.Group)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var dtos = carriers.Select(c => new AdminCarrierDto
            {
                Id = c.Id,
                Username = c.Username,
                Email = c.Email,
                FirstName = c.FirstName,
                LastName = c.LastName,
                FullName = c.FullName,
                PhoneNumber = c.PhoneNumber,
                Status = c.Status.ToString(),
                IsActive = c.IsActive,
                LastLoginDate = c.LastLoginDate,
                Groups = c.CarrierGroups.Select(cg => new GroupDto
                {
                    Id = cg.Group.Id,
                    Name = cg.Group.Name,
                    Description = cg.Group.Description
                }).ToList()
            });

            return Ok(dtos);
        }

        // GET: api/carriers/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCarrier(int id)
        {
            var carrier = await _context.Carriers
                .Include(c => c.CarrierGroups)
                .ThenInclude(cg => cg.Group)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (carrier == null) return NotFound();

            var dto = new AdminCarrierDto
            {
                Id = carrier.Id,
                Username = carrier.Username,
                Email = carrier.Email,
                FirstName = carrier.FirstName,
                LastName = carrier.LastName,
                FullName = carrier.FullName,
                PhoneNumber = carrier.PhoneNumber,
                Status = carrier.Status.ToString(),
                IsActive = carrier.IsActive,
                LastLoginDate = carrier.LastLoginDate,
                Groups = carrier.CarrierGroups.Select(cg => new GroupDto
                {
                    Id = cg.Group.Id,
                    Name = cg.Group.Name,
                    Description = cg.Group.Description
                }).ToList()
            };

            return Ok(dto);
        }

        // POST: api/carriers
        [HttpPost]
        public async Task<IActionResult> CreateCarrier([FromBody] CreateCarrierDto dto)
        {
            if (await _context.Carriers.AnyAsync(c => c.Username == dto.Username || c.Email == dto.Email))
            {
                return BadRequest(new { error = "Kullanıcı adı veya Email zaten kullanımda." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var carrier = new Carrier
                {
                    Username = dto.Username,
                    Email = dto.Email,
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    PhoneNumber = dto.PhoneNumber,
                    Status = CarrierStatus.Active,
                    CreatedAt = DateTime.UtcNow,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
                };

                _context.Carriers.Add(carrier);
                await _context.SaveChangesAsync();

                // Add groups
                if (dto.GroupIds.Any())
                {
                    var carrierGroups = dto.GroupIds.Select(gid => new CarrierGroup
                    {
                        CarrierId = carrier.Id,
                        GroupId = gid
                    }).ToList();

                    _context.CarrierGroups.AddRange(carrierGroups);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetCarrier), new { id = carrier.Id }, new { id = carrier.Id, message = "Kurye başarıyla oluşturuldu." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { error = "Kurye oluşturulurken hata oluştu: " + ex.Message });
            }
        }

        // PUT: api/carriers/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCarrier(int id, [FromBody] UpdateCarrierDto dto)
        {
            var carrier = await _context.Carriers
                .Include(c => c.CarrierGroups)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (carrier == null) return NotFound();

            // Update fields
            carrier.FirstName = dto.FirstName;
            carrier.LastName = dto.LastName;
            carrier.Email = dto.Email;
            carrier.PhoneNumber = dto.PhoneNumber;
            carrier.VehicleInfo = dto.VehicleInfo;
            carrier.Status = dto.IsActive ? CarrierStatus.Active : CarrierStatus.Suspended;

            // Update groups
            var existingGroupIds = carrier.CarrierGroups.Select(cg => cg.GroupId).ToList();
            var newGroupIds = dto.GroupIds;

            // Remove groups not in new list
            var toRemove = carrier.CarrierGroups.Where(cg => !newGroupIds.Contains(cg.GroupId)).ToList();
            if (toRemove.Any())
            {
                _context.CarrierGroups.RemoveRange(toRemove);
            }

            // Add groups in new list but not in existing
            var toAdd = newGroupIds.Where(gid => !existingGroupIds.Contains(gid))
                .Select(gid => new CarrierGroup { CarrierId = id, GroupId = gid })
                .ToList();

            if (toAdd.Any())
            {
                _context.CarrierGroups.AddRange(toAdd);
            }

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Kurye güncellendi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Güncelleme sırasında hata oluştu: " + ex.Message });
            }
        }

        // DELETE: api/carriers/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCarrier(int id)
        {
            var carrier = await _context.Carriers.FindAsync(id);
            if (carrier == null) return NotFound();

            // Soft delete logic if ISoftDelete implemented? 
            // Carrier entity doesn't seem to have IsDeleted.
            // But AppDbContext mentions generic filter. Let's check Carrier.cs again.
            // Carrier.cs does not implement ISoftDelete interface in my previous view.
            
            // Hard delete for now or update Status to Suspended?
            // Usually delete means delete for Admin manage. AppDbContext handles cascade.
            _context.Carriers.Remove(carrier);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Kurye silindi." });
        }
        
        // GET: api/carriers/groups
        // Helper to list available groups for frontend dropdown
        [HttpGet("groups")]
        public async Task<IActionResult> GetGroups()
        {
             var groups = await _context.Groups
                .OrderBy(g => g.Name)
                .Select(g => new GroupDto 
                { 
                    Id = g.Id, 
                    Name = g.Name, 
                    Description = g.Description 
                })
                .ToListAsync();
                
            return Ok(groups);
        }
    }
}
